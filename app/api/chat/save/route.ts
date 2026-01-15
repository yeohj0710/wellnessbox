import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  sessionId: string;
  title?: string;
  messages: Array<{
    id: string;
    role: "system" | "user" | "assistant";
    content: string;
    createdAt?: number;
  }>;
  tzOffsetMinutes?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody;
    const actor = await resolveActorForRequest(req, {
      intent: "write",
    });
    const clientId = actor.deviceClientId;
    const appUserId = actor.appUserId;
    const { sessionId, title, messages, tzOffsetMinutes } = body || ({} as SaveBody);
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 500 });
    }
    if (actor.loggedIn && !appUserId) {
      return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });

    const existingSession = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true, appUserId: true },
    });

    if (existingSession?.appUserId) {
      if (!actor.loggedIn || existingSession.appUserId !== appUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (existingSession && !existingSession.appUserId) {
      if (existingSession.clientId !== clientId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Upsert session
    await db.chatSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        clientId,
        appUserId: actor.loggedIn ? appUserId ?? undefined : undefined,
        title: title || "새 대화",
        status: "active",
      },
      update: {
        title: title || undefined,
      },
    });

    if (Array.isArray(messages) && messages.length > 0) {
      await db.$transaction(
        messages.map((m) =>
          db.chatMessage.upsert({
            where: { id: m.id },
            create: {
              id: m.id,
              sessionId,
              role: m.role as any,
              content: m.content,
              tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
              createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
            },
            update: {
              role: m.role as any,
              content: m.content,
              tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
            },
          })
        )
      );
    }

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

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const clientId = actor.deviceClientId;
    const appUserId = actor.appUserId;

    if (!clientId && !appUserId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    if (actor.loggedIn && !appUserId) {
      return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
    }

    const sessions = await db.chatSession.findMany({
      where: actor.loggedIn
        ? {
            OR: [
              appUserId ? { appUserId } : { id: "missing" },
              clientId ? { clientId, appUserId: null } : { id: "missing" },
            ],
          }
        : { clientId: clientId ?? "", appUserId: null },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });

    const payload = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.getTime(),
      updatedAt: s.updatedAt.getTime(),
      appUserId: s.appUserId,
      messages: s.messages.map((m) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt.getTime(),
      })),
    }));

    const res = NextResponse.json(
      {
        sessions: payload,
        actor: {
          loggedIn: actor.loggedIn,
          appUserId: actor.appUserId,
          deviceClientId: actor.deviceClientId,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
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
