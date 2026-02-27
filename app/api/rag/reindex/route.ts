import { runRagReindexPostRoute } from "@/lib/server/rag-reindex-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runRagReindexPostRoute();
}
