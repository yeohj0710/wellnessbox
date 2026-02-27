import { runLogoutGetRoute, runLogoutPostRoute } from "@/lib/server/logout-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return runLogoutPostRoute();
}

export async function GET(req: Request) {
  return runLogoutGetRoute(req);
}
