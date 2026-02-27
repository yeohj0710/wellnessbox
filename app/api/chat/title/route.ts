import { runChatTitlePostRoute } from "./route-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return runChatTitlePostRoute(req);
}
