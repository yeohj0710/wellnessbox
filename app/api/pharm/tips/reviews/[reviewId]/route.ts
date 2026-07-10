import { runPharmInterimDecisionRoute } from "@/lib/server/wb-rnd-interim-route";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await context.params;
  return runPharmInterimDecisionRoute(req, reviewId);
}
