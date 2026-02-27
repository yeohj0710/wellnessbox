import {
  runAdminBatchReportExportPostRoute,
} from "@/lib/b2b/admin-report-export-batch-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runAdminBatchReportExportPostRoute(req);
}
