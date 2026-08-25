import { NextRequest } from "next/server";
import { runProOutcomeRoute } from "@/lib/server/pro-outcome-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runProOutcomeRoute(req);
}
