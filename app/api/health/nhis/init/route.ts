import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeHyphenEasyLoginOrg } from "@/lib/shared/hyphen-login";
import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import { getNhisLink, upsertNhisLink } from "@/lib/server/hyphen/link";
import { resolveNhisIdentityHash } from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { getPendingEasyAuth, savePendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const initSchema = z.object({
  loginMethod: z.literal("EASY").optional().default("EASY"),
  loginOrgCd: z.string().trim().min(1).max(20),
  resNm: z.string().trim().min(1).max(60),
  resNo: z.string().trim().regex(/^\d{8}$/),
  mobileNo: z.string().trim().regex(/^\d{10,11}$/),
});

function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}

function isSameIdentityInput(
  input: { loginOrgCd: string; resNm: string; resNo: string; mobileNo: string },
  pending: {
    loginOrgCd: string;
    resNm: string;
    resNo: string;
    mobileNo: string;
  }
) {
  return (
    input.loginOrgCd === pending.loginOrgCd &&
    input.resNm === pending.resNm &&
    input.resNo === pending.resNo &&
    input.mobileNo === pending.mobileNo
  );
}

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  if (!raw) return badRequest("Invalid JSON body");

  const parsed = initSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }

  const input = parsed.data;
  const loginOrgCd = normalizeHyphenEasyLoginOrg(input.loginOrgCd);
  if (!loginOrgCd) return badRequest("loginOrgCd must be kakao");
  if (loginOrgCd !== "kakao") {
    return badRequest("Only kakao loginOrgCd is supported in current deployment");
  }
  const [existingLink, pendingEasyAuth] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    getPendingEasyAuth(),
  ]);

  const identity = resolveNhisIdentityHash({
    appUserId: auth.data.appUserId,
    loginOrgCd,
    resNm: input.resNm,
    resNo: input.resNo,
    mobileNo: input.mobileNo,
  });
  const requestDefaults = buildNhisRequestDefaults();

  if (
    existingLink?.linked !== true &&
    existingLink?.stepData &&
    pendingEasyAuth &&
    existingLink.lastIdentityHash === identity.identityHash &&
    isSameIdentityInput(
      {
        loginOrgCd,
        resNm: input.resNm,
        resNo: input.resNo,
        mobileNo: input.mobileNo,
      },
      pendingEasyAuth
    )
  ) {
    await upsertNhisLink(auth.data.appUserId, {
      linked: false,
      loginMethod: "EASY",
      loginOrgCd,
      lastIdentityHash: identity.identityHash,
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    return NextResponse.json(
      {
        ok: true,
        nextStep: "sign",
        linked: false,
        reused: true,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  try {
    const initResponse = await runWithHyphenInFlightDedup(
      "nhis-init",
      `${auth.data.appUserId}|${identity.identityHash}|${loginOrgCd}`,
      () =>
        fetchMedicalInfo({
          loginMethod: "EASY",
          loginOrgCd,
          resNm: input.resNm,
          resNo: input.resNo,
          mobileNo: input.mobileNo,
          ...requestDefaults,
          stepMode: "step",
          step: "init",
          showCookie: "Y",
        })
    );

    const stepData = extractStepData(initResponse);
    const cookieData = extractCookieData(initResponse);
    if (stepData == null) {
      throw new Error("Init response does not include stepData");
    }

    await Promise.all([
      upsertNhisLink(auth.data.appUserId, {
        linked: false,
        loginMethod: "EASY",
        loginOrgCd,
        stepMode: "step",
        stepData: toPrismaJson(stepData),
        cookieData: toPrismaJson(cookieData),
        lastIdentityHash: identity.identityHash,
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      savePendingEasyAuth({
        loginMethod: "EASY",
        loginOrgCd,
        resNm: input.resNm,
        resNo: input.resNo,
        mobileNo: input.mobileNo,
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        nextStep: "sign",
        linked: false,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    await upsertNhisLink(auth.data.appUserId, {
      linked: false,
      loginMethod: "EASY",
      loginOrgCd,
      lastIdentityHash: identity.identityHash,
      lastErrorCode: errorInfo.code ?? null,
      lastErrorMessage: errorInfo.message ?? null,
    });
    return hyphenErrorToResponse(
      error,
      "인증 요청에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요."
    );
  }
}
