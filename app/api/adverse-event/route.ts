import { NextRequest } from "next/server";
import { runAdverseEventReportRoute } from "@/lib/server/adverse-event-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runAdverseEventReportRoute(req);
}
