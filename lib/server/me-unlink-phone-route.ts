import "server-only";

import { resolveDbRouteError } from "@/lib/server/db-error";
import {
  clearPhoneFromSession,
  unlinkPhoneForUser,
} from "@/lib/server/me-phone-route";
import { noStoreJson } from "@/lib/server/no-store";

const UNLINK_PHONE_FAILED_ERROR =
  "\uC804\uD654\uBC88\uD638 \uC5F0\uACB0 \uD574\uC81C \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runMeUnlinkPhonePostRoute(auth: { kakaoId: string }) {
  try {
    await unlinkPhoneForUser(auth.kakaoId);
    await clearPhoneFromSession();
    return noStoreJson({ ok: true });
  } catch (error) {
    const dbError = resolveDbRouteError(error, UNLINK_PHONE_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
