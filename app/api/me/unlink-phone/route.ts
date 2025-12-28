import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import getSession from "@/lib/session";

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
    const id = await requireUserId();
    const clientId = typeof id === "string" ? id : String(id);

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    await db.appUser.updateMany({
      where: { kakaoId: clientId },
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
