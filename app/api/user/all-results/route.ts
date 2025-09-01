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
    const [assess, checkAi] = await Promise.all([
      db.assessmentResult.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return new Response(JSON.stringify({ clientId, assess, checkAi }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
