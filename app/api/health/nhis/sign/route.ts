import { runNhisSignPostRoute } from "@/lib/server/hyphen/sign-route";
import { withDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";

const NHIS_SIGN_POST_ERROR =
  "\uCE74\uCE74\uC624\uD1A1 \uC778\uC99D \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const POST = withDbRouteError(
  NHIS_SIGN_POST_ERROR,
  runNhisSignPostRoute
);
