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
  logHyphenError,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { recordNhisOperationalAttempt } from "@/lib/server/hyphen/fetch-attempt";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  clearPendingEasyAuth,
  evaluateAndRecordSignAttempt,
  getPendingEasyAuth,
} from "@/lib/server/hyphen/session";
import { requireNhisSession } from "@/lib/server/route-auth";
export const runtime = "nodejs";
const signSchema = z.object({ otpOrAuthResult: z.unknown().optional() });
const STALE_SIGN_ERROR_CODES = new Set(["LOGIN-999", "C0012-001"]);
const SIGN_REINIT_REQUIRED_CODE = "NHIS_SIGN_REINIT_REQUIRED";
const SIGN_RATE_LIMIT_CODE = "NHIS_SIGN_RATE_LIMIT";

function isSignAutoReinitEnabled() {
  const raw = (process.env.HYPHEN_NHIS_SIGN_AUTO_REINIT || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}

function isStaleSignErrorCode(code: string | null | undefined) {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return false;
  return STALE_SIGN_ERROR_CODES.has(normalized);
}

function resolveSignGuidance(input: {
  code: string | null | undefined;
  message: string | null | undefined;
}) {
  const code = (input.code || "").trim().toUpperCase();
  const message = (input.message || "").trim().toLowerCase();

  if (isStaleSignErrorCode(code)) {
    return {
      nextAction: "init" as const,
      reason: "nhis_auth_expired",
      status: 409,
      error:
        "인증 세션이 만료되었습니다. 카카오 인증 요청(init)부터 다시 진행해 주세요.",
    };
  }

  if (
    message.includes("요청") &&
    (message.includes("없") || message.includes("만료"))
  ) {
    return {
      nextAction: "init" as const,
      reason: "nhis_sign_init_required",
      status: 409,
      error:
        "인증 요청 정보가 없거나 만료되었습니다. 카카오 인증 요청(init)을 다시 진행해 주세요.",
    };
  }

  if (
    message.includes("승인") ||
    message.includes("대기") ||
    message.includes("카카오톡")
  ) {
    return {
      nextAction: "sign" as const,
      reason: "nhis_sign_pending",
      status: 409,
      error:
        "카카오톡 인증 승인 대기 중입니다. 승인 후 '연동 완료 확인'을 다시 진행해 주세요.",
    };
  }

  return null;
}

function recordSignOperationalAttemptSafe(input: {
  appUserId: string;
  statusCode: number;
  ok: boolean;
  reason: string;
  identityHash?: string | null;
}) {
  void recordNhisOperationalAttempt({
    appUserId: input.appUserId,
    action: "sign",
    statusCode: input.statusCode,
    ok: input.ok,
    reason: input.reason,
    identityHash: input.identityHash ?? null,
  }).catch((error) => {
    logHyphenError("[hyphen][sign] failed to record operational attempt", error);
  });
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
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 409,
      ok: false,
      reason: "init_required",
      identityHash: link?.lastIdentityHash ?? null,
    });
    return NextResponse.json(
      {
        ok: false,
        code: "NHIS_INIT_REQUIRED",
        reason: "nhis_init_required",
        nextAction: "init",
        error:
          "연동 초기화가 필요합니다. 인증 요청(init)을 먼저 진행해 주세요.",
      },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }
  if (!pendingEasyAuth) {
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 409,
      ok: false,
      reason: "auth_expired",
      identityHash: link.lastIdentityHash ?? null,
    });
    return NextResponse.json(
      {
        ok: false,
        code: "NHIS_AUTH_EXPIRED",
        reason: "nhis_auth_expired",
        nextAction: "init",
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
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 200,
      ok: true,
      reason: "already_linked",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      { ok: true, linked: true, reused: true },
      { headers: NO_STORE_HEADERS }
    );
  }
  const signThrottle = await evaluateAndRecordSignAttempt();
  if (!signThrottle.allowed) {
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 429,
      ok: false,
      reason: "rate_limited",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      {
        ok: false,
        code: SIGN_RATE_LIMIT_CODE,
        reason: "nhis_sign_rate_limited",
        nextAction: "wait",
        error:
          "연동 완료 확인 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
        retryAfterSec: signThrottle.retryAfterSec,
        availableAt: signThrottle.availableAt,
        throttle: signThrottle.snapshot,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(signThrottle.retryAfterSec),
        },
      }
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
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 200,
      ok: true,
      reason: "linked",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      { ok: true, linked: true },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    if (isSignAutoReinitEnabled() && isStaleSignErrorCode(errorInfo.code)) {
      try {
        const reinitResponse = await runWithHyphenInFlightDedup(
          "nhis-init",
          `${auth.data.appUserId}|${identity.identityHash}|${pendingEasyAuth.loginOrgCd}|sign-reinit`,
          () =>
            fetchMedicalInfo({
              loginMethod: "EASY",
              loginOrgCd: pendingEasyAuth.loginOrgCd,
              resNm: pendingEasyAuth.resNm,
              resNo: pendingEasyAuth.resNo,
              mobileNo: pendingEasyAuth.mobileNo,
              ...requestDefaults,
              stepMode: "step",
              step: "init",
              showCookie: "Y",
            })
        );

        const nextStepData = extractStepData(reinitResponse);
        const nextCookieData = extractCookieData(reinitResponse);
        if (nextStepData) {
          await upsertNhisLink(auth.data.appUserId, {
            linked: false,
            loginMethod: "EASY",
            loginOrgCd: pendingEasyAuth.loginOrgCd,
            stepMode: "step",
            stepData: toPrismaJson(nextStepData),
            cookieData: toPrismaJson(nextCookieData),
            lastIdentityHash: identity.identityHash,
            lastErrorCode: null,
            lastErrorMessage: null,
          });
          recordSignOperationalAttemptSafe({
            appUserId: auth.data.appUserId,
            statusCode: 409,
            ok: false,
            reason: "reinitialized",
            identityHash: identity.identityHash,
          });
          return NextResponse.json(
            {
              ok: false,
              linked: false,
              nextAction: "sign",
              code: SIGN_REINIT_REQUIRED_CODE,
              reinitialized: true,
              error:
                "인증 세션이 만료되어 인증 요청을 다시 시작했습니다. 카카오톡 인증을 확인한 뒤 다시 시도해 주세요.",
            },
            { status: 409, headers: NO_STORE_HEADERS }
          );
        }
      } catch (reinitError) {
        logHyphenError("[hyphen][sign] auto re-init failed", reinitError);
      }
    }

    await saveNhisLinkError(auth.data.appUserId, {
      code: errorInfo.code,
      message: errorInfo.message,
    });
    const guidance = resolveSignGuidance({
      code: errorInfo.code,
      message: errorInfo.message,
    });
    if (guidance) {
      recordSignOperationalAttemptSafe({
        appUserId: auth.data.appUserId,
        statusCode: guidance.status,
        ok: false,
        reason: guidance.reason,
        identityHash: identity.identityHash,
      });
      return NextResponse.json(
        {
          ok: false,
          code: errorInfo.code || null,
          reason: guidance.reason,
          nextAction: guidance.nextAction,
          error: guidance.error,
        },
        { status: guidance.status, headers: NO_STORE_HEADERS }
      );
    }
    recordSignOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 502,
      ok: false,
      reason: errorInfo.code || "sign_failed",
      identityHash: identity.identityHash,
    });
    return hyphenErrorToResponse(
      error,
      "인증 완료(sign) 처리에 실패했습니다. 카카오톡 승인 상태를 확인한 뒤 다시 시도해 주세요."
    );
  }
}
