import {
  runWbRndRecommendPreviewGetRoute,
  runWbRndRecommendPreviewPostRoute,
} from "@/lib/server/wb-rnd-recommend-preview-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return runWbRndRecommendPreviewGetRoute();
}

export async function POST(req: Request) {
  return runWbRndRecommendPreviewPostRoute(req);
}
