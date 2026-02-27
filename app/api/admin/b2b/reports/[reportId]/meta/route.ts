import { runAdminReportMetaPatchRoute } from "@/lib/b2b/admin-report-meta-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";

const META_PATCH_ERROR =
  "\uB9AC\uD3EC\uD2B8 \uD45C\uC2DC \uC5F0\uC6D4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const PATCH = withDbRouteError(META_PATCH_ERROR, runAdminReportMetaPatchRoute);
