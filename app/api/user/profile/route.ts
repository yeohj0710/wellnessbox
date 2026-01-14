import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const deviceClientId = actor.deviceClientId;
    if (!deviceClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    const rec = await db.userProfile.findUnique({
      where: { clientId: deviceClientId },
    });
    if (!rec) {
      const res = new NextResponse(null, { status: 204 });
      if (actor.cookieToSet) {
        res.cookies.set(
          actor.cookieToSet.name,
          actor.cookieToSet.value,
          actor.cookieToSet.options
        );
      }
      return res;
    }
    const res = NextResponse.json({
      clientId: rec.clientId,
      profile: rec.data,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    });
    if (actor.cookieToSet) {
      res.cookies.set(
        actor.cookieToSet.name,
        actor.cookieToSet.value,
        actor.cookieToSet.options
      );
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const actor = await resolveActorForRequest(req, { intent: "write" });
    const deviceClientId = actor.deviceClientId;
    if (!deviceClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    await ensureClient(deviceClientId, {
      userAgent: req.headers.get("user-agent"),
    });
    const profile = body?.profile;
    if (profile == null) {
      await db.userProfile
        .delete({ where: { clientId: deviceClientId } })
        .catch(() => {});
      const res = new NextResponse(null, { status: 204 });
      if (actor.cookieToSet) {
        res.cookies.set(
          actor.cookieToSet.name,
          actor.cookieToSet.value,
          actor.cookieToSet.options
        );
      }
      return res;
    }
    const saved = await db.userProfile.upsert({
      where: { clientId: deviceClientId },
      create: { clientId: deviceClientId, data: profile },
      update: { data: profile },
    });
    const res = NextResponse.json({
      clientId: saved.clientId,
      profile: saved.data,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
    if (actor.cookieToSet) {
      res.cookies.set(
        actor.cookieToSet.name,
        actor.cookieToSet.value,
        actor.cookieToSet.options
      );
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
