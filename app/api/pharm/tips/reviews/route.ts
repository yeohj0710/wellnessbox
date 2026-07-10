import { runPharmInterimReviewsRoute } from "@/lib/server/wb-rnd-interim-route";

export const runtime = "nodejs";

export async function GET() {
  return runPharmInterimReviewsRoute();
}
