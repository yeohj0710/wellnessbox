import { runRagDebugGetRoute } from "@/lib/server/rag-debug-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runRagDebugGetRoute(req);
}
