import { NextRequest, NextResponse } from "next/server";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";
import { getLatestResultsByScope } from "@/lib/server/results";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const scopeAppUserId = actor.loggedIn ? actor.appUserId : null;
    const scopeClientId = actor.deviceClientId;
    if (!scopeAppUserId && !scopeClientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    if (scopeClientId) {
      await ensureClient(scopeClientId, {
        userAgent: req.headers.get("user-agent"),
      });
    }
    const results = await getLatestResultsByScope({
      appUserId: scopeAppUserId,
      clientId: scopeClientId,
    });
    const res = NextResponse.json({
      clientId: scopeClientId,
      results,
    });
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
