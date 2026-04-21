import { runNhisUnlinkPostRoute } from "@/lib/server/hyphen/unlink-route";
import { withDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";

const NHIS_UNLINK_POST_ERROR =
  "\uAC74\uAC15 \uC5F0\uB3D9 \uD574\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const POST = withDbRouteError(
  NHIS_UNLINK_POST_ERROR,
  runNhisUnlinkPostRoute
);
