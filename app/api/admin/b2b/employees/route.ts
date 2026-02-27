import { runAdminEmployeeListGetRoute } from "@/lib/b2b/admin-employee-list-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPLOYEE_LIST_GET_ERROR =
  "\uC9C1\uC6D0 \uBAA9\uB85D \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(EMPLOYEE_LIST_GET_ERROR, runAdminEmployeeListGetRoute);
