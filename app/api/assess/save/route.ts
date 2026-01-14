import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { ensureClient } from "@/lib/server/client";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  assertSnapshotVersion,
  buildAssessQuestionSnapshot,
  buildAssessScoreSnapshot,
  pickAssessResultSummary,
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

    const { answers, cResult, tzOffsetMinutes } = body || {};
    const deviceClientId = actor.deviceClientId;

    if (!deviceClientId || typeof deviceClientId !== "string") {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    if (!answers || !cResult) {
      return new Response(
        JSON.stringify({ error: "Missing answers or cResult" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await ensureClient(deviceClientId, {
      userAgent: req.headers.get("user-agent"),
    });

    const questionSnapshot = buildAssessQuestionSnapshot();
    const scoreSnapshot = buildAssessScoreSnapshot(cResult);

    assertSnapshotVersion(questionSnapshot, "questionSnapshot");
    assertSnapshotVersion(scoreSnapshot, "scoreSnapshot");

    const cResultToStore = pickAssessResultSummary(scoreSnapshot, cResult);

    const rec = await db.assessmentResult.create({
      data: {
        client: { connect: { id: deviceClientId } },

        ...(actor.appUserId
          ? { appUser: { connect: { id: actor.appUserId } } }
          : {}),

        answers: answers as unknown as Prisma.InputJsonValue,
        cResult: cResultToStore as unknown as Prisma.InputJsonValue,
        questionSnapshot: questionSnapshot as unknown as Prisma.InputJsonValue,
        scoreSnapshot:
          scoreSnapshot === null
            ? Prisma.DbNull
            : (scoreSnapshot as unknown as Prisma.InputJsonValue),
        tzOffsetMinutes:
          typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
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
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
