import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeleteBody = {
  sessionId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeleteBody;
    const actor = await resolveActorForRequest(req, { intent: "write" });
    const clientId = actor.deviceClientId;
    const appUserId = actor.appUserId;
    const sessionId = body?.sessionId;

    if (!clientId && !appUserId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 500 });
    }
    if (actor.loggedIn && !appUserId) {
      return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true, appUserId: true },
    });

    if (!session) {
      return NextResponse.json({ ok: true });
    }

    if (session.appUserId) {
      if (!actor.loggedIn || session.appUserId !== appUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!clientId || session.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.chatSession.delete({ where: { id: sessionId } });

    const res = NextResponse.json({ ok: true });
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
