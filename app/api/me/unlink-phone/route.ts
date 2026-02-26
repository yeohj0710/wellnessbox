import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

async function clearPhoneFromSession() {
  const session = await getSession();
  const u = (session as any)?.user;
  if (!u) return;

  u.phone = undefined;
  u.phoneLinkedAt = undefined;

  if (typeof (session as any)?.save === "function") {
    await (session as any).save();
  }
}

export async function POST() {
  try {
    const auth = await requireUserSession();
    if (!auth.ok) return auth.response;
    const { kakaoId } = auth.data;

    await db.appUser.updateMany({
      where: { kakaoId },
      data: { phone: null, phoneLinkedAt: null },
    });

    await clearPhoneFromSession();

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
