import { NextRequest, NextResponse } from "next/server";
import { ensureClient, resolveClientIdFromRequest } from "@/lib/server/client";
import { getLatestResults } from "@/lib/server/results";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qId = url.searchParams.get("clientId");
    const { clientId, cookieToSet } = resolveClientIdFromRequest(req, qId, "query");
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const results = await getLatestResults(clientId);
    const res = NextResponse.json({ clientId, results });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

