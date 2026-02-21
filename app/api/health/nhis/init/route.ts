import { NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizeHyphenEasyLoginOrg,
  normalizeHyphenPassMobileCo,
} from "@/lib/shared/hyphen-login";
import {
  extractCookieData,
  extractStepData,
  fetchCheckupList,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { saveNhisLinkError, upsertNhisLink } from "@/lib/server/hyphen/link";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { savePendingEasyAuth } from "@/lib/server/hyphen/session";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const initSchema = z.object({
  loginMethod: z.literal("EASY").optional().default("EASY"),
  loginOrgCd: z.string().trim().min(1).max(20),
  resNm: z.string().trim().min(1).max(60),
  resNo: z.string().trim().regex(/^\d{8}$/),
  mobileNo: z.string().trim().regex(/^\d{10,11}$/),
  mobileCo: z.string().trim().min(2).max(20).optional(),
});

function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = initSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }

  const input = parsed.data;
  const loginOrgCd = normalizeHyphenEasyLoginOrg(input.loginOrgCd);
  if (!loginOrgCd) {
    return badRequest("loginOrgCd must be one of pass, kakao, toss");
  }
  const normalizedPassMobileCo =
    loginOrgCd === "pass"
      ? normalizeHyphenPassMobileCo(input.mobileCo)
      : undefined;
  if (loginOrgCd === "pass" && !normalizedPassMobileCo) {
    return badRequest("mobileCo must be one of SKT, KT, LGT when loginOrgCd=pass");
  }
  const mobileCo: string | undefined =
    loginOrgCd === "pass" ? normalizedPassMobileCo ?? undefined : undefined;

  try {
    const initResponse = await fetchCheckupList({
      loginMethod: "EASY",
      loginOrgCd,
      resNm: input.resNm,
      resNo: input.resNo,
      mobileNo: input.mobileNo,
      mobileCo,
      stepMode: "step",
      step: "init",
      showCookie: "Y",
    });

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
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      savePendingEasyAuth({
        loginMethod: "EASY",
        loginOrgCd,
        resNm: input.resNm,
        resNo: input.resNo,
        mobileNo: input.mobileNo,
        mobileCo,
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        nextStep: "sign",
        linked: false,
      },
      {
        headers: NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    await saveNhisLinkError(auth.data.appUserId, {
      code: errorInfo.code,
      message: errorInfo.message,
    });
    return hyphenErrorToResponse(
      error,
      "인증 요청에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요."
    );
  }
}
