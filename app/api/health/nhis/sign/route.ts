import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import {
  getNhisLink,
  saveNhisLinkError,
  upsertNhisLink,
} from "@/lib/server/hyphen/link";
import { resolveNhisIdentityHash } from "@/lib/server/hyphen/fetch-cache";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  clearPendingEasyAuth,
  getPendingEasyAuth,
} from "@/lib/server/hyphen/session";
import { requireNhisSession } from "@/lib/server/route-auth";
export const runtime = "nodejs";
const signSchema = z.object({ otpOrAuthResult: z.unknown().optional() });
function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}
export async function POST(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  const rawBody = await req.json().catch(() => ({}));
  const parsed = signSchema.safeParse(rawBody);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }
  const [link, pendingEasyAuth] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    getPendingEasyAuth(),
  ]);
  const requestDefaults = buildNhisRequestDefaults();
  if (!link?.stepData) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "연동 초기화가 필요합니다. 인증 요청(init)을 먼저 진행해 주세요.",
      },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }
  if (!pendingEasyAuth) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "인증 세션이 만료되었습니다. 인증 요청(init)을 다시 진행해 주세요.",
      },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }
  const identity = resolveNhisIdentityHash({
    appUserId: auth.data.appUserId,
    loginOrgCd: pendingEasyAuth.loginOrgCd,
    resNm: pendingEasyAuth.resNm,
    resNo: pendingEasyAuth.resNo,
    mobileNo: pendingEasyAuth.mobileNo,
    storedIdentityHash: link.lastIdentityHash,
  });
  if (
    link.linked === true &&
    link.cookieData &&
    link.lastIdentityHash === identity.identityHash
  ) {
    return NextResponse.json(
      { ok: true, linked: true, reused: true },
      { headers: NO_STORE_HEADERS }
    );
  }
  try {
    const signResponse = await runWithHyphenInFlightDedup(
      "nhis-sign",
      `${auth.data.appUserId}|${identity.identityHash}|${pendingEasyAuth.loginOrgCd}`,
      () =>
        fetchMedicalInfo({
          loginMethod: "EASY",
          loginOrgCd: pendingEasyAuth.loginOrgCd,
          resNm: pendingEasyAuth.resNm,
          resNo: pendingEasyAuth.resNo,
          mobileNo: pendingEasyAuth.mobileNo,
          ...requestDefaults,
          stepMode: "step",
          step: "sign",
          step_data: link.stepData,
          cookieData: link.cookieData ?? undefined,
          showCookie: "Y",
          ...(parsed.data.otpOrAuthResult !== undefined
            ? { otpOrAuthResult: parsed.data.otpOrAuthResult }
            : {}),
        })
    );
    const nextStepData = extractStepData(signResponse);
    const nextCookieData = extractCookieData(signResponse);
    await Promise.all([
      upsertNhisLink(auth.data.appUserId, {
        linked: true,
        loginMethod: "EASY",
        loginOrgCd: pendingEasyAuth.loginOrgCd,
        stepMode: "step",
        stepData: toPrismaJson(nextStepData ?? link.stepData),
        cookieData: toPrismaJson(nextCookieData ?? link.cookieData),
        lastIdentityHash: identity.identityHash,
        lastLinkedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      clearPendingEasyAuth(),
    ]);
    return NextResponse.json(
      { ok: true, linked: true },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    await saveNhisLinkError(auth.data.appUserId, {
      code: errorInfo.code,
      message: errorInfo.message,
    });
    return hyphenErrorToResponse(
      error,
      "인증 완료(sign) 처리에 실패했습니다. 카카오톡 승인 상태를 확인한 뒤 다시 시도해 주세요."
    );
  }
}
