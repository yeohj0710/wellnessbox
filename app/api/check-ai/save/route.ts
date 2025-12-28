import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveClientIdForWrite } from "@/lib/server/client-link";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, cookieToSet } = await resolveClientIdForWrite(
      req,
      body?.clientId
    );
    const { result, answers, tzOffsetMinutes } = body || {};
    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    if (!result) {
      return NextResponse.json({ error: "Missing result" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const rec = await db.checkAiResult.create({
      data: {
        clientId,
        result,
        answers,
        tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
      },
    });
    const res = NextResponse.json({ ok: true, id: rec.id });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

