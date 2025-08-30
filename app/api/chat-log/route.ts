import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ensureClient, toDate } from "@/lib/server/client";

export const runtime = "nodejs";

type Msg = { id: string; role: "system" | "user" | "assistant"; content: string; createdAt: number | string | Date; tokensIn?: number; tokensOut?: number; meta?: any; tzOffsetMinutes?: number };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, sessionId, title, messages, tzOffsetMinutes } = body as { clientId: string; sessionId: string; title: string; messages: Msg[]; tzOffsetMinutes?: number };
    if (!clientId || !sessionId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing clientId, sessionId, or messages" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });

    await db.chatSession.upsert({
      where: { id: sessionId },
      create: { id: sessionId, clientId, title: title || "새 상담" },
      update: { title: title || undefined },
    });

    // Insert messages idempotently (skip existing ids)
    for (const m of messages) {
      try {
        await db.chatMessage.create({
          data: {
            id: m.id,
            sessionId,
            role: m.role as any,
            content: m.content ?? "",
            tokensIn: m.tokensIn ?? null,
            tokensOut: m.tokensOut ?? null,
            meta: m.meta ?? undefined,
            tzOffsetMinutes: typeof m.tzOffsetMinutes === "number" ? m.tzOffsetMinutes : (typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0),
            createdAt: toDate(m.createdAt),
          },
        });
      } catch {
        // ignore duplicates
      }
    }

    // Touch updatedAt
    await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

