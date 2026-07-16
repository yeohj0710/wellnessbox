import {
  runUserInterimRecommendationRoute,
  runUserInterimStatusRoute,
} from "@/lib/server/wb-rnd-interim-route";
import { takeTipsPostTestDependencies } from "@/lib/server/wb-rnd-tips-route-test-hook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return runUserInterimStatusRoute();
}

export async function POST(req: Request) {
  const dependencies = takeTipsPostTestDependencies(req);
  return runUserInterimRecommendationRoute(req, dependencies);
}
