import {
  runCSectionScorePostRoute,
} from "@/lib/assess/c-section-score-route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return runCSectionScorePostRoute(req);
}
