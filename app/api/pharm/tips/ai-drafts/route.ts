import { runPharmAiDraftsRoute } from "@/lib/server/wb-rnd-interim-route";

export const dynamic = "force-dynamic";

export async function GET() {
  return runPharmAiDraftsRoute();
}
