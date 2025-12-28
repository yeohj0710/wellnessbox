import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveClientIdForRead, resolveClientIdForWrite } from "@/lib/server/client-link";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qId = url.searchParams.get("clientId");
    const { clientId, cookieToSet } = await resolveClientIdForRead(
      req,
      qId,
      "query"
    );
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    const rec = await db.userProfile.findUnique({ where: { clientId } });
    if (!rec) {
      const res = new NextResponse(null, { status: 204 });
      if (cookieToSet) {
        res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
      }
      return res;
    }
    const res = NextResponse.json({
      clientId: rec.clientId,
      profile: rec.data,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientId, cookieToSet } = await resolveClientIdForWrite(
      req,
      body?.clientId
    );
    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const profile = body?.profile;
    if (profile == null) {
      await db.userProfile.delete({ where: { clientId } }).catch(() => {});
      const res = new NextResponse(null, { status: 204 });
      if (cookieToSet) {
        res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
      }
      return res;
    }
    const saved = await db.userProfile.upsert({
      where: { clientId },
      create: { clientId, data: profile },
      update: { data: profile },
    });
    const res = NextResponse.json({
      clientId: saved.clientId,
      profile: saved.data,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
    if (cookieToSet) {
      res.cookies.set(cookieToSet.name, cookieToSet.value, cookieToSet.options);
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

