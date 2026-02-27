import { runEmployeeReportPdfGetRoute } from "@/lib/b2b/employee-report-export-pdf-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return runEmployeeReportPdfGetRoute(req);
}
