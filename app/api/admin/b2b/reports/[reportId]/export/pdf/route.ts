import {
  runAdminReportPdfGetRoute,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-export-pdf-route";

export const runtime = "nodejs";

type RouteContext = B2bReportRouteContext;

export async function GET(req: Request, ctx: RouteContext) {
  return runAdminReportPdfGetRoute(req, ctx);
}
