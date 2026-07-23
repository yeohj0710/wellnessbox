import { runPharmAiDraftDecisionRoute } from "@/lib/server/wb-rnd-interim-route";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ draftId: string }> };

export async function POST(request: Request, context: Context) {
  const { draftId } = await context.params;
  return runPharmAiDraftDecisionRoute(request, draftId);
}
