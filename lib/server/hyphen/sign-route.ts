import "server-only";

import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { requireNhisSession } from "@/lib/server/route-auth";
import {
  persistNhisLinkedSign,
  runNhisSignStep,
} from "@/lib/server/hyphen/sign-route-executor";
import { handleNhisSignFailure } from "@/lib/server/hyphen/sign-route-failure";
import {
  badSignRequest,
  recordSignOperationalAttemptSafe,
  resolveSignExecutionContext,
  signSchema,
} from "@/lib/server/hyphen/sign-route-helpers";

const SIGN_FAILURE_MESSAGE =
  "인증 완료(sign) 처리에 실패했습니다. 카카오톡 확인 상태를 확인한 뒤 다시 시도해 주세요.";

export async function runNhisSignRoute(input: {
  req: Request;
  appUserId: string;
  signFailureMessage: string;
}) {
  const rawBody = await input.req.json().catch(() => ({}));
  const parsed = signSchema.safeParse(rawBody);
  if (!parsed.success) {
    return badSignRequest(parsed.error.issues[0]?.message || "입력값을 확인해 주세요.");
  }

  const signContext = await resolveSignExecutionContext({
    appUserId: input.appUserId,
  });
  if (!signContext.ok) {
    return signContext.response;
  }

  const { link, pendingEasyAuth, identity, requestDefaults } = signContext.context;

  try {
    const { nextStepData, nextCookieData } = await runNhisSignStep({
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      pendingEasyAuth,
      requestDefaults,
      stepData: link.stepData,
      cookieData: link.cookieData,
      otpOrAuthResult: parsed.data.otpOrAuthResult,
    });

    await persistNhisLinkedSign({
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      pendingEasyAuth,
      linkStepData: link.stepData,
      linkCookieData: link.cookieData,
      nextStepData,
      nextCookieData,
    });

    recordSignOperationalAttemptSafe({
      appUserId: input.appUserId,
      statusCode: 200,
      ok: true,
      reason: "linked",
      identityHash: identity.identityHash,
    });
    return nhisNoStoreJson({ ok: true, linked: true });
  } catch (error) {
    return handleNhisSignFailure({
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      pendingEasyAuth,
      requestDefaults,
      error,
      fallbackMessage: input.signFailureMessage,
    });
  }
}

export async function runNhisSignPostRoute(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  return runNhisSignRoute({
    req,
    appUserId: auth.data.appUserId,
    signFailureMessage: SIGN_FAILURE_MESSAGE,
  });
}
