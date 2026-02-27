import {
  runAdminReportValidationGetRoute,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-validation-route";

export const runtime = "nodejs";

type RouteContext = B2bReportRouteContext;

export async function GET(_req: Request, ctx: RouteContext) {
  return runAdminReportValidationGetRoute(ctx);
}
