import { runUserInterimProfileRoute } from "@/lib/server/wb-rnd-interim-route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return runUserInterimProfileRoute(req);
}
