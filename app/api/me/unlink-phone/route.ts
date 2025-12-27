import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

const isJsonObject = (v: unknown): v is Prisma.JsonObject =>
  !!v && typeof v === "object" && !Array.isArray(v);

export async function POST() {
  try {
    const id = await requireUserId();
    const clientId = typeof id === "string" ? id : String(id);

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await db.userProfile.findUnique({
      where: { clientId },
      select: { data: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: true });
    }

    const current = isJsonObject(profile.data) ? profile.data : {};
    const next: Prisma.JsonObject = { ...current };

    delete next.phone;
    delete next.phoneLinkedAt;

    await db.userProfile.update({
      where: { clientId },
      data: { data: next as Prisma.InputJsonValue },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
