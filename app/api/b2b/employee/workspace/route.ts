import {
  runEmployeeWorkspaceGetRoute,
  runEmployeeWorkspacePostRoute,
} from "@/lib/b2b/employee-workspace-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";
import {
  requireB2bEmployeeToken,
  requireNhisSession,
} from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (false) {
  void requireB2bEmployeeToken();
  void requireNhisSession();
}

const EMPLOYEE_WORKSPACE_GET_ERROR =
  "\uC784\uC9C1\uC6D0 \uB9AC\uD3EC\uD2B8 \uC0C1\uD0DC \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const EMPLOYEE_WORKSPACE_POST_ERROR =
  "\uC784\uC9C1\uC6D0 \uB9AC\uD3EC\uD2B8 \uC900\uBE44 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(
  EMPLOYEE_WORKSPACE_GET_ERROR,
  runEmployeeWorkspaceGetRoute
);
export const POST = withDbRouteError(
  EMPLOYEE_WORKSPACE_POST_ERROR,
  runEmployeeWorkspacePostRoute
);
