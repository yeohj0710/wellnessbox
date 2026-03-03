import {
  runAdminEmployeeOpsGetRoute,
  runAdminEmployeeOpsPostRoute,
} from "@/lib/b2b/admin-employee-management-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPLOYEE_OPS_GET_ERROR =
  "\uC9C1\uC6D0 \uC6B4\uC601 \uC0C1\uC138 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const EMPLOYEE_OPS_POST_ERROR =
  "\uC9C1\uC6D0 \uB370\uC774\uD130 \uC6B4\uC601 \uC791\uC5C5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(EMPLOYEE_OPS_GET_ERROR, runAdminEmployeeOpsGetRoute);
export const POST = withDbRouteError(EMPLOYEE_OPS_POST_ERROR, runAdminEmployeeOpsPostRoute);
