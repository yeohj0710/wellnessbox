import { NextRequest } from "next/server";
import { runLatestResultsGetRoute } from "@/lib/server/latest-results-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runLatestResultsGetRoute(req);
}
