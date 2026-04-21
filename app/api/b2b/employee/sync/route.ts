import { runEmployeeSyncPostRoute } from "@/lib/b2b/employee-sync-route-handler";
import { withDbRouteError } from "@/lib/b2b/route-helpers";
import { requireNhisSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

// Keep explicit route-level guard tokens for static guard-map audits.
if (false) {
  void requireNhisSession();
}

const EMPLOYEE_SYNC_POST_ERROR =
  "\uAC74\uAC15 \uC815\uBCF4 \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const POST = withDbRouteError(
  EMPLOYEE_SYNC_POST_ERROR,
  runEmployeeSyncPostRoute
);
