export const runtime = "nodejs";

import { requireAdminSession } from "@/lib/server/route-auth";
import { runRagIngestPostRoute } from "@/lib/server/rag-ingest-route";

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runRagIngestPostRoute(req);
}
