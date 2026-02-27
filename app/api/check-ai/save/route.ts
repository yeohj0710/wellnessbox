import { NextRequest } from "next/server";
import { runCheckAiSaveRoute } from "@/lib/server/check-ai-save-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runCheckAiSaveRoute(req);
}
