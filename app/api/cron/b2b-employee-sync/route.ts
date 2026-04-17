import { processDueEmployeeBackgroundSyncStates } from "@/lib/b2b/employee-background-sync";
import { noStoreJson } from "@/lib/server/no-store";
import { requireCronSecret } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireCronSecret(req);
  if (!auth.ok) return auth.response;

  const processed = await processDueEmployeeBackgroundSyncStates({
    take: 8,
  });

  return noStoreJson({
    ok: true,
    processed,
  });
}
