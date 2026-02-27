import { runHomeDataGetRoute } from "@/lib/server/home-data-route";

export const runtime = "nodejs";

export async function GET() {
  return runHomeDataGetRoute();
}
