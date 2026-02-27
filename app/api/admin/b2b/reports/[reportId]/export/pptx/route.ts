import {
  runAdminReportPptxGetRoute,
} from "@/lib/b2b/admin-report-export-pptx-route";
import type { B2bReportRouteContext } from "@/lib/b2b/admin-report-route";

export const runtime = "nodejs";

type RouteContext = B2bReportRouteContext;

export async function GET(_req: Request, ctx: RouteContext) {
  return runAdminReportPptxGetRoute(ctx);
}
