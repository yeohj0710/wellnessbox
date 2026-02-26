import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserSession();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, loggedIn: false },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
  const { kakaoId, phone: sessionPhone } = auth.data;
  let phone = sessionPhone ?? "";
  let linkedAt: string | undefined;

  const profile = await db.appUser.findUnique({
    where: { kakaoId },
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
