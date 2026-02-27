import { runMeUnlinkPhonePostRoute } from "@/lib/server/me-unlink-phone-route";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  return runMeUnlinkPhonePostRoute({ kakaoId: auth.data.kakaoId });
}
