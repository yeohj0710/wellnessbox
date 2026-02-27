import { runAdminDemoSeedPostRoute } from "@/lib/b2b/admin-demo-seed-route";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return runAdminDemoSeedPostRoute();
}
