import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ensureClient, getClientIdFromRequest } from "@/lib/server/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qId = url.searchParams.get("clientId");
    const clientId = qId || (await getClientIdFromRequest());
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing clientId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const rec = await db.userProfile.findUnique({ where: { clientId } });
    if (!rec) return new Response(null, { status: 204 });
    return new Response(
      JSON.stringify({
        clientId: rec.clientId,
        profile: rec.data,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = body?.clientId || (await getClientIdFromRequest());
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing clientId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const profile = body?.profile;
    if (profile == null) {
      await db.userProfile.delete({ where: { clientId } }).catch(() => {});
      return new Response(null, { status: 204 });
    }
    const saved = await db.userProfile.upsert({
      where: { clientId },
      create: { clientId, data: profile },
      update: { data: profile },
    });
    return new Response(
      JSON.stringify({
        clientId: saved.clientId,
        profile: saved.data,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

