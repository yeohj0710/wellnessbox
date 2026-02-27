import { NextRequest } from "next/server";
import {
  runChatPostRoute,
} from "./route-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return runChatPostRoute(req);
}
