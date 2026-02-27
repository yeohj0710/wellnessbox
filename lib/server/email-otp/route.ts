import "server-only";

import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import {
  EMAIL_SEND_FAILED_ERROR,
  EMAIL_SEND_INPUT_INVALID_ERROR,
  EMAIL_SEND_REQUEST_FORMAT_INVALID_ERROR,
  EMAIL_VERIFY_FAILED_ERROR,
  EMAIL_VERIFY_INPUT_INVALID_ERROR,
  EMAIL_VERIFY_REQUEST_FORMAT_INVALID_ERROR,
} from "./constants";
import { parseEmailBody, parseEmailCodeBody } from "./parsing";
import {
  issueEmailOtpForUser,
  resolveSendEmailOtpResult,
  syncEmailToUserSession,
  verifyAndLinkEmailForUser,
} from "./service";

export async function runEmailSendOtpPostRoute(
  req: Request,
  auth: { kakaoId: string }
) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return noStoreJson(
      { ok: false, error: EMAIL_SEND_REQUEST_FORMAT_INVALID_ERROR },
      400
    );
  }

  const parsed = parseEmailBody(body);
  if (!parsed.ok) {
    return noStoreJson({ ok: false, error: EMAIL_SEND_INPUT_INVALID_ERROR }, 400);
  }

  try {
    const result = resolveSendEmailOtpResult(
      await issueEmailOtpForUser({
        kakaoId: auth.kakaoId,
        email: parsed.data.email,
      })
    );
    if (!result.ok) {
      return noStoreJson(
        {
          ok: false,
          error: result.error,
          ...(result.retryAfterSec ? { retryAfterSec: result.retryAfterSec } : {}),
        },
        result.status
      );
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    const dbError = resolveDbRouteError(error, EMAIL_SEND_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function runEmailVerifyOtpPostRoute(
  req: Request,
  auth: { kakaoId: string }
) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return noStoreJson(
      { ok: false, error: EMAIL_VERIFY_REQUEST_FORMAT_INVALID_ERROR },
      400
    );
  }

  const parsed = parseEmailCodeBody(body);
  if (!parsed.ok) {
    return noStoreJson({ ok: false, error: EMAIL_VERIFY_INPUT_INVALID_ERROR }, 400);
  }

  const now = new Date();

  try {
    const verified = await verifyAndLinkEmailForUser({
      kakaoId: auth.kakaoId,
      email: parsed.data.email,
      code: parsed.data.code,
      now,
    });
    if (!verified.ok) {
      return noStoreJson({ ok: false, error: verified.error }, verified.status);
    }

    await syncEmailToUserSession(verified.email);
    return noStoreJson({ ok: true, email: verified.email });
  } catch (error) {
    const dbError = resolveDbRouteError(error, EMAIL_VERIFY_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
