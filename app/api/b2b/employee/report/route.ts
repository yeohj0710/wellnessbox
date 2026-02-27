import { runB2bEmployeeReportGetRoute } from "@/lib/b2b/employee-report-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPLOYEE_REPORT_GET_ERROR =
  "\uC9C1\uC6D0 \uB9AC\uD3EC\uD2B8 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export const GET = withDbRouteError(EMPLOYEE_REPORT_GET_ERROR, runB2bEmployeeReportGetRoute);
