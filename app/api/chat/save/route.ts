import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveClientIdForAppUserRequest } from "@/lib/server/client-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  clientId: string;
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
    const { clientId, cookieToSet } = await resolveClientIdForAppUserRequest(
      req,
      body?.clientId,
      "body",
      "write"
    );
    const { sessionId, title, messages, tzOffsetMinutes } = body || ({} as SaveBody);
    if (!clientId || !sessionId) {
      return NextResponse.json({ error: "Missing clientId or sessionId" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });

    const existingSession = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true },
    });

    if (existingSession && existingSession.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert session
    await db.chatSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        clientId,
        title: title || "새 대화",
        status: "active",
      },
      update: {
        title: title || undefined,
      },
    });

    if (Array.isArray(messages) && messages.length > 0) {
      // createMany with skipDuplicates (needs unique id)
      await db.chatMessage.createMany({
        data: messages.map((m) => ({
          id: m.id,
          sessionId,
          role: m.role as any,
          content: m.content,
          tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
          createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
        })),
        skipDuplicates: true,
      });
    }

    const res = NextResponse.json({ ok: true });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { clientId, cookieToSet } = await resolveClientIdForAppUserRequest(
      req,
      null,
      "query",
      "read"
    );

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const sessions = await db.chatSession.findMany({
      where: { clientId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });

    const payload = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.getTime(),
      updatedAt: s.updatedAt.getTime(),
      messages: s.messages.map((m) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt.getTime(),
      })),
    }));

    const res = NextResponse.json(
      { sessions: payload },
      { headers: { "Cache-Control": "no-store" } }
    );
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

