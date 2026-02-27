import { NextRequest } from "next/server";
import { runChatDeletePostRoute } from "./route-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return runChatDeletePostRoute(req);
}
