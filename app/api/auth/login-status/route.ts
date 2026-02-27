import { runLoginStatusGetRoute } from "@/lib/server/login-status-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return runLoginStatusGetRoute();
}
