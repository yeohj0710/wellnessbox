import { runNhisStatusGetAuthedRoute } from "@/lib/server/hyphen/status-route";
import { withDbRouteError } from "@/lib/server/db-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NHIS_STATUS_GET_ERROR =
  "\uAC74\uAC15 \uC5F0\uB3D9 \uC0C1\uD0DC \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(
  NHIS_STATUS_GET_ERROR,
  runNhisStatusGetAuthedRoute
);
