import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import getSession from "@/lib/session";

export const runtime = "nodejs";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

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

    const profile = await db.userProfile.findUnique({
      where: { clientId },
      select: { data: true },
    });

    if (profile) {
      const current = isPlainObject(profile.data)
        ? (profile.data as Record<string, unknown>)
        : {};

      const { phone: _phone, phoneLinkedAt: _phoneLinkedAt, ...rest } = current;

      await db.userProfile.update({
        where: { clientId },
        data: { data: rest as Prisma.InputJsonValue },
      });
    }

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
