import { NextRequest } from "next/server";
import { runPushDetachPostRoute } from "@/lib/server/push-detach-route";

export async function POST(req: NextRequest) {
  return runPushDetachPostRoute(req);
}
