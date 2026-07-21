import { runUserInterimProCorrectionRoute } from "@/lib/server/wb-rnd-interim-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return runUserInterimProCorrectionRoute(req);
}
