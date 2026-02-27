import { NextRequest } from "next/server";
import { runChatSaveGetRoute, runChatSavePostRoute } from "./route-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return runChatSavePostRoute(req);
}

export async function GET(req: NextRequest) {
  return runChatSaveGetRoute(req);
}
