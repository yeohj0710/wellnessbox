import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

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

  const profile = await db.userProfile.findUnique({
    where: { clientId },
    select: { data: true },
  });

  if (profile) {
    const data = isPlainObject(profile.data) ? profile.data : {};
    phone = typeof data.phone === "string" ? data.phone : phone;
    linkedAt = typeof data.phoneLinkedAt === "string" ? data.phoneLinkedAt : linkedAt;
  }

  return NextResponse.json(
    { ok: true, loggedIn: true, phone, linkedAt },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
