import { NextRequest, NextResponse } from "next/server";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";
import { getLatestResultsByScope } from "@/lib/server/results";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    let scope: { appUserId: string } | { clientId: string };
    if (actor.loggedIn) {
      const appUserId = actor.appUserId;
      if (!appUserId) {
        return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
      }
      scope = { appUserId };
    } else {
      const clientId = actor.deviceClientId;
      if (!clientId) {
        return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
      }
      scope = { clientId };
    }
    if (actor.deviceClientId) {
      await ensureClient(actor.deviceClientId, {
        userAgent: req.headers.get("user-agent"),
      });
    }
    const results = await getLatestResultsByScope(scope);
    const res = NextResponse.json({
      clientId: actor.deviceClientId,
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
