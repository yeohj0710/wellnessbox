import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient, resolveClientIdFromRequest } from "@/lib/server/client";

export const runtime = "nodejs";

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
    const { clientId, cookieToSet } = resolveClientIdFromRequest(req, body?.clientId);
    const { sessionId, title, messages, tzOffsetMinutes } = body || ({} as SaveBody);
    if (!clientId || !sessionId) {
      return NextResponse.json({ error: "Missing clientId or sessionId" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });

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

