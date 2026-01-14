import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveClientIdForWrite } from "@/lib/server/client-link";
import { sectionA, sectionB } from "@/app/assess/data/questions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, cookieToSet } = await resolveClientIdForWrite(
      req,
      body?.clientId
    );
    const { answers, cResult, tzOffsetMinutes } = body || {};
    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    if (!answers || !cResult) {
      return new Response(JSON.stringify({ error: "Missing answers or cResult" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    await ensureClient(clientId, { userAgent: req.headers.get("user-agent") });
    const questionSnapshot = [...sectionA, ...sectionB].map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options ?? null,
      min: question.min ?? null,
      max: question.max ?? null,
    }));
    const scoreSnapshot =
      cResult && typeof cResult === "object"
        ? {
            catsOrdered: (cResult as any).catsOrdered ?? null,
            percents: (cResult as any).percents ?? null,
          }
        : null;

    const rec = await db.assessmentResult.create({
      data: {
        clientId,
        answers,
        cResult,
        questionSnapshot,
        scoreSnapshot,
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
