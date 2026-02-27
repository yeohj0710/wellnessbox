import { runMeNicknameCheckPostRoute } from "@/lib/server/me-nickname-check-route";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;

  return runMeNicknameCheckPostRoute(req, {
    kakaoId: auth.data.kakaoId,
  });
}
