import { runMeLinkPhonePostRoute } from "@/lib/server/me-link-phone-route";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  return runMeLinkPhonePostRoute(req, {
    kakaoId: auth.data.kakaoId,
  });
}
