import { runAgentPlaygroundPostRoute } from "@/lib/server/agent-playground-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runAgentPlaygroundPostRoute(req);
}
