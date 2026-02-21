import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeHyphenEasyLoginOrg } from "@/lib/shared/hyphen-login";
import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { upsertNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
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

  const raw = await req.json().catch(() => null);
  if (!raw) return badRequest("Invalid JSON body");

  const parsed = initSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }

  const input = parsed.data;
  const requestDefaults = buildNhisRequestDefaults();
  const loginOrgCd = normalizeHyphenEasyLoginOrg(input.loginOrgCd);
  if (!loginOrgCd) return badRequest("loginOrgCd must be kakao");
  if (loginOrgCd !== "kakao") {
    return badRequest("Only kakao loginOrgCd is supported in current deployment");
  }

  try {
    const initResponse = await fetchMedicalInfo({
      loginMethod: "EASY",
      loginOrgCd,
      resNm: input.resNm,
      resNo: input.resNo,
      mobileNo: input.mobileNo,
      ...requestDefaults,
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
      lastErrorCode: errorInfo.code ?? null,
      lastErrorMessage: errorInfo.message ?? null,
    });
    return hyphenErrorToResponse(
      error,
      "인증 요청에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요."
    );
  }
}
