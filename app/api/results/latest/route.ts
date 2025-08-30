import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getClientIdFromRequest, ensureClient } from "@/lib/server/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qClientId = url.searchParams.get("clientId");
    const cookieClientId = await getClientIdFromRequest();
    const clientId = qClientId ?? cookieClientId;
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing clientId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;
    await ensureClient(clientId, { userAgent });

    const [assess, checkAi] = await Promise.all([
      db.assessmentResult.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findFirst({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return new Response(JSON.stringify({ assess, checkAi }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
