import { NextRequest } from "next/server";
import { runAiExperimentTrackRoute } from "@/lib/server/ai-experiment-track-route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runAiExperimentTrackRoute(req);
}
