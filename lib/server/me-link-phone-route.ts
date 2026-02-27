import "server-only";

import { resolveDbRouteError } from "@/lib/server/db-error";
import {
  linkPhoneForUser,
  syncLinkedPhoneToSession,
} from "@/lib/server/me-phone-route";
import { noStoreJson } from "@/lib/server/no-store";
import {
  parsePhoneCodeBody,
  resolvePhoneOtpFailure,
  verifyAndConsumePhoneOtp,
} from "@/lib/server/phone-otp-route";

const REQUEST_FORMAT_INVALID_ERROR =
  "\uC694\uCCAD \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694.";
const INPUT_INVALID_ERROR =
  "\uC785\uB825\uAC12\uC744 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const LINK_PHONE_FAILED_ERROR =
  "\uC804\uD654\uBC88\uD638 \uC778\uC99D \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runMeLinkPhonePostRoute(
  req: Request,
  auth: { kakaoId: string }
) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return noStoreJson({ ok: false, error: REQUEST_FORMAT_INVALID_ERROR }, 400);
  }

  const parsed = parsePhoneCodeBody(body);
  if (!parsed.ok) {
    return noStoreJson({ ok: false, error: INPUT_INVALID_ERROR }, 400);
  }

  const verified = await verifyAndConsumePhoneOtp(parsed.data);
  if (!verified.ok) {
    const failure = resolvePhoneOtpFailure({ reason: verified.reason });
    return noStoreJson({ ok: false, error: failure.error }, failure.status);
  }

  const now = new Date();
  const phone = parsed.data.phone;

  try {
    const linked = await linkPhoneForUser({
      kakaoId: auth.kakaoId,
      phone,
      now,
    });
    await syncLinkedPhoneToSession(linked);
    return noStoreJson({ ok: true, phone: linked.phone, linkedAt: linked.linkedAt });
  } catch (error) {
    const dbError = resolveDbRouteError(error, LINK_PHONE_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
