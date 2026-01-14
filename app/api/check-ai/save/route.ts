import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  assertSnapshotVersion,
  buildCheckAiQuestionSnapshot,
  buildCheckAiScoreSnapshot,
  pickCheckAiResultSummary,
} from "@/lib/server/result-normalizer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = await resolveActorForRequest(req, {
      intent: "write",
      candidate: body?.clientId,
      candidateSource: "body",
    });
    const { result, answers, tzOffsetMinutes, questionSnapshot: incomingQuestionSnapshot } =
      body || {};
    const deviceClientId = actor.deviceClientId;
    if (!deviceClientId || typeof deviceClientId !== "string") {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }
    if (!result) {
      return NextResponse.json({ error: "Missing result" }, { status: 400 });
    }
    await ensureClient(deviceClientId, {
      userAgent: req.headers.get("user-agent"),
    });
    const questionSnapshot = buildCheckAiQuestionSnapshot(
      incomingQuestionSnapshot
    );
    const scoreSnapshot = buildCheckAiScoreSnapshot(result);
    assertSnapshotVersion(questionSnapshot, "questionSnapshot");
    assertSnapshotVersion(scoreSnapshot, "scoreSnapshot");
    const resultToStore = pickCheckAiResultSummary(result);

    const rec = await db.checkAiResult.create({
      data: {
        clientId: deviceClientId,
        appUserId: actor.appUserId ?? undefined,
        result: resultToStore,
        answers,
        questionSnapshot,
        scoreSnapshot,
        tzOffsetMinutes: typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
      },
    });
    const res = NextResponse.json({ ok: true, id: rec.id });
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
