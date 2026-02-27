import { z } from "zod";
import { resolveNhisIdentityHash } from "@/lib/server/hyphen/fetch-cache";
import { recordNhisOperationalAttempt } from "@/lib/server/hyphen/fetch-attempt";
import { getNhisLink } from "@/lib/server/hyphen/link";
import type { HyphenSignThrottleDecision } from "@/lib/server/hyphen/session";
import {
  buildNhisRequestDefaults,
} from "@/lib/server/hyphen/request-defaults";
import {
  evaluateAndRecordSignAttempt,
  getPendingEasyAuth,
} from "@/lib/server/hyphen/session";
import {
  nhisAuthExpiredJson,
  nhisInitRequiredJson,
  nhisNoStoreJson,
  nhisNoStoreRetryJson,
} from "@/lib/server/hyphen/nhis-route-responses";
import {
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";

export const signSchema = z.object({ otpOrAuthResult: z.unknown().optional() });
export const SIGN_REINIT_REQUIRED_CODE = "NHIS_SIGN_REINIT_REQUIRED";
export const SIGN_RATE_LIMIT_CODE = "NHIS_SIGN_RATE_LIMIT";

const STALE_SIGN_ERROR_CODES = new Set(["LOGIN-999", "C0012-001"]);

export function isSignAutoReinitEnabled() {
  const raw = (process.env.HYPHEN_NHIS_SIGN_AUTO_REINIT || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function badSignRequest(message: string) {
  return nhisNoStoreJson({ ok: false, error: message }, 400);
}

export function isStaleSignErrorCode(code: string | null | undefined) {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return false;
  return STALE_SIGN_ERROR_CODES.has(normalized);
}

export function resolveSignGuidance(input: {
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

export function recordSignOperationalAttemptSafe(input: {
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

export function buildSignInitRequiredResponse(input: {
  appUserId: string;
  identityHash: string | null | undefined;
}) {
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 409,
    ok: false,
    reason: "init_required",
    identityHash: input.identityHash ?? null,
  });
  return nhisInitRequiredJson(
    "연동 초기화가 필요합니다. 인증 요청(init)을 먼저 진행해 주세요."
  );
}

export function buildSignAuthExpiredResponse(input: {
  appUserId: string;
  identityHash: string | null | undefined;
}) {
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 409,
    ok: false,
    reason: "auth_expired",
    identityHash: input.identityHash ?? null,
  });
  return nhisAuthExpiredJson(
    "인증 세션이 만료되었습니다. 인증 요청(init)을 다시 진행해 주세요."
  );
}

export function buildSignAlreadyLinkedResponse(input: {
  appUserId: string;
  identityHash: string;
}) {
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 200,
    ok: true,
    reason: "already_linked",
    identityHash: input.identityHash,
  });
  return nhisNoStoreJson({ ok: true, linked: true, reused: true });
}

type BlockedSignThrottle = Extract<HyphenSignThrottleDecision, { allowed: false }>;

export function buildSignRateLimitedResponse(input: {
  appUserId: string;
  identityHash: string;
  signThrottle: BlockedSignThrottle;
}) {
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 429,
    ok: false,
    reason: "rate_limited",
    identityHash: input.identityHash,
  });
  return nhisNoStoreRetryJson(
    {
      ok: false,
      code: SIGN_RATE_LIMIT_CODE,
      reason: "nhis_sign_rate_limited",
      nextAction: "wait",
      error: "연동 완료 확인 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
      retryAfterSec: input.signThrottle.retryAfterSec,
      availableAt: input.signThrottle.availableAt,
      throttle: input.signThrottle.snapshot,
    },
    429,
    input.signThrottle.retryAfterSec
  );
}

type ResolvedSignExecutionContext = {
  link: NonNullable<Awaited<ReturnType<typeof getNhisLink>>>;
  pendingEasyAuth: NonNullable<Awaited<ReturnType<typeof getPendingEasyAuth>>>;
  identity: ReturnType<typeof resolveNhisIdentityHash>;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
};

export async function resolveSignExecutionContext(input: {
  appUserId: string;
}) {
  const [link, pendingEasyAuth] = await Promise.all([
    getNhisLink(input.appUserId),
    getPendingEasyAuth(),
  ]);
  const requestDefaults = buildNhisRequestDefaults();

  if (!link?.stepData) {
    return {
      ok: false as const,
      response: buildSignInitRequiredResponse({
        appUserId: input.appUserId,
        identityHash: link?.lastIdentityHash ?? null,
      }),
    };
  }

  if (!pendingEasyAuth) {
    return {
      ok: false as const,
      response: buildSignAuthExpiredResponse({
        appUserId: input.appUserId,
        identityHash: link.lastIdentityHash ?? null,
      }),
    };
  }

  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
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
    return {
      ok: false as const,
      response: buildSignAlreadyLinkedResponse({
        appUserId: input.appUserId,
        identityHash: identity.identityHash,
      }),
    };
  }

  const signThrottle = await evaluateAndRecordSignAttempt();
  if (!signThrottle.allowed) {
    return {
      ok: false as const,
      response: buildSignRateLimitedResponse({
        appUserId: input.appUserId,
        identityHash: identity.identityHash,
        signThrottle,
      }),
    };
  }

  return {
    ok: true as const,
    context: {
      link,
      pendingEasyAuth,
      identity,
      requestDefaults,
    } satisfies ResolvedSignExecutionContext,
  };
}

export function buildSignGuidanceResponse(input: {
  appUserId: string;
  identityHash: string;
  errorCode: string | null | undefined;
  guidance: ReturnType<typeof resolveSignGuidance>;
}) {
  if (!input.guidance) return null;
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: input.guidance.status,
    ok: false,
    reason: input.guidance.reason,
    identityHash: input.identityHash,
  });
  return nhisNoStoreJson(
    {
      ok: false,
      code: input.errorCode || null,
      reason: input.guidance.reason,
      nextAction: input.guidance.nextAction,
      error: input.guidance.error,
    },
    input.guidance.status
  );
}
