import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const user = session.user;

  const loggedIn = user?.loggedIn === true && typeof user?.kakaoId === "number";

  if (!loggedIn) {
    return NextResponse.json(
      { ok: false, loggedIn: false },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  const clientId = String(user.kakaoId);

  let phone = typeof user.phone === "string" ? user.phone : "";
  let linkedAt = typeof user.phoneLinkedAt === "string" ? user.phoneLinkedAt : undefined;

  const profile = await db.appUser.findUnique({
    where: { kakaoId: clientId },
    select: { phone: true, phoneLinkedAt: true },
  });

  if (profile) {
    phone = typeof profile.phone === "string" ? profile.phone : phone;
    const linkedAtIso = profile.phoneLinkedAt
      ? profile.phoneLinkedAt.toISOString()
      : undefined;
    linkedAt = linkedAtIso ?? linkedAt;
  }

  return NextResponse.json(
    { ok: true, loggedIn: true, phone, linkedAt },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
