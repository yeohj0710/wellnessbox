import {
  REPORT_CREATE_ERROR,
  REPORT_GET_ERROR,
} from "@/lib/b2b/admin-employee-route-errors";
import {
  runAdminEmployeeReportGetRoute,
  runAdminEmployeeReportPostRoute,
} from "@/lib/b2b/admin-employee-report-route";
import { withDbRouteError } from "@/lib/b2b/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withDbRouteError(REPORT_GET_ERROR, runAdminEmployeeReportGetRoute);

export const POST = withDbRouteError(REPORT_CREATE_ERROR, runAdminEmployeeReportPostRoute);
