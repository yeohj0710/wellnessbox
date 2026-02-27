import { runInternalWarmupGetRoute } from "@/lib/server/internal-warmup-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return runInternalWarmupGetRoute(req);
}
