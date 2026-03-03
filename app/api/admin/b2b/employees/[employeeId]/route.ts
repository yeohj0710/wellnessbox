import { runAdminEmployeeDetailGetRouteWithRequest } from "@/lib/b2b/admin-employee-detail-route";
import {
  runAdminEmployeeDeleteRoute,
  runAdminEmployeePatchRoute,
} from "@/lib/b2b/admin-employee-management-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPLOYEE_DETAIL_READ_FAILED_ERROR =
  "\uC9C1\uC6D0 \uC0C1\uC138 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const EMPLOYEE_PATCH_FAILED_ERROR =
  "\uC9C1\uC6D0 \uC815\uBCF4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const EMPLOYEE_DELETE_FAILED_ERROR =
  "\uC9C1\uC6D0 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(
  EMPLOYEE_DETAIL_READ_FAILED_ERROR,
  runAdminEmployeeDetailGetRouteWithRequest
);
export const PATCH = withDbRouteError(
  EMPLOYEE_PATCH_FAILED_ERROR,
  runAdminEmployeePatchRoute
);
export const DELETE = withDbRouteError(
  EMPLOYEE_DELETE_FAILED_ERROR,
  runAdminEmployeeDeleteRoute
);
