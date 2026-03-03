import { saveNhisLinkError } from "@/lib/server/hyphen/link";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
  logHyphenError,
} from "@/lib/server/hyphen/route-utils";
import { tryAutoReinitAfterStaleSign } from "@/lib/server/hyphen/sign-route-executor";
import {
  buildSignGuidanceResponse,
  isSignAutoReinitEnabled,
  isStaleSignErrorCode,
  recordSignOperationalAttemptSafe,
  resolveSignGuidance,
} from "@/lib/server/hyphen/sign-route-helpers";

type AutoReinitInput = Parameters<typeof tryAutoReinitAfterStaleSign>[0];

export async function handleNhisSignFailure(input: {
  appUserId: string;
  identityHash: string;
  pendingEasyAuth: AutoReinitInput["pendingEasyAuth"];
  requestDefaults: AutoReinitInput["requestDefaults"];
  error: unknown;
  fallbackMessage: string;
}) {
  const errorInfo = getErrorCodeMessage(input.error);
  if (isSignAutoReinitEnabled() && isStaleSignErrorCode(errorInfo.code)) {
    try {
      const reinitResponse = await tryAutoReinitAfterStaleSign({
        appUserId: input.appUserId,
        identityHash: input.identityHash,
        pendingEasyAuth: input.pendingEasyAuth,
        requestDefaults: input.requestDefaults,
      });
      if (reinitResponse) return reinitResponse;
    } catch (reinitError) {
      logHyphenError("[hyphen][sign] auto re-init failed", reinitError);
    }
  }

  const guidance = resolveSignGuidance({
    code: errorInfo.code,
    message: errorInfo.message,
  });
  if (!guidance || guidance.nextAction !== "sign") {
    try {
      await saveNhisLinkError(input.appUserId, {
        code: errorInfo.code,
        message: errorInfo.message,
      });
    } catch (persistError) {
      logHyphenError("[hyphen][sign] failed to persist link error", persistError);
    }
  }
  const guidanceResponse = buildSignGuidanceResponse({
    appUserId: input.appUserId,
    identityHash: input.identityHash,
    errorCode: errorInfo.code,
    guidance,
  });
  if (guidanceResponse) return guidanceResponse;

  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 502,
    ok: false,
    reason: errorInfo.code || "sign_failed",
    identityHash: input.identityHash,
  });
  return hyphenErrorToResponse(input.error, input.fallbackMessage);
}
