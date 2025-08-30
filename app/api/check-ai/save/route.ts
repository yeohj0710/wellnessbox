import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, result, tzOffsetMinutes } = body || {};
    if (!clientId || typeof clientId !== "string") {
      return new Response(JSON.stringify({ error: "Missing clientId" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!result) {
      return new Response(JSON.stringify({ error: "Missing result" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const rec = await db.checkAiResult.create({
      data: {
        clientId,
        result,
        tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
      },
    });
    return new Response(JSON.stringify({ ok: true, id: rec.id }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

