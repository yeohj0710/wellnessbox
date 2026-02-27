import { NextRequest } from "next/server";
import { runMeProfilePostRoute } from "@/lib/server/me-profile-route";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  return runMeProfilePostRoute(req, {
    kakaoId: auth.data.kakaoId,
  });
}
