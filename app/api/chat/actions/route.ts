import { NextRequest } from "next/server";
import { runChatActionsPostRoute } from "./route-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return runChatActionsPostRoute(req);
}
