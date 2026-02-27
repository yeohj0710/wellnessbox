import { NextRequest } from "next/server";
import { runUserLatestResultsGetRoute } from "@/lib/server/user-latest-results-route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runUserLatestResultsGetRoute(req);
}
