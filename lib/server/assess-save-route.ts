import "server-only";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";
import { ensureClient } from "@/lib/server/client";
import {
  assertSnapshotVersion,
  buildAssessQuestionSnapshot,
  buildAssessScoreSnapshot,
  pickAssessResultSummary,
} from "@/lib/server/result-normalizer";

const MISSING_CLIENT_ID_ERROR = "Missing clientId";
const MISSING_ANSWERS_OR_RESULT_ERROR = "Missing answers or cResult";
const UNKNOWN_ERROR = "Unknown error";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildAssessSaveResponse(input: {
  id: string;
  cookieToSet?: {
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  };
}) {
  const response = NextResponse.json({ ok: true, id: input.id });
  if (input.cookieToSet) {
    response.cookies.set(
      input.cookieToSet.name,
      input.cookieToSet.value,
      input.cookieToSet.options
    );
  }
  return response;
}

export async function runAssessSaveRoute(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = await resolveActorForRequest(req, {
      intent: "write",
    });

    const { answers, cResult, tzOffsetMinutes } = body || {};
    const deviceClientId = actor.deviceClientId;

    if (!deviceClientId) {
      return NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 500 });
    }
    if (!answers || !cResult) {
      return NextResponse.json(
        { error: MISSING_ANSWERS_OR_RESULT_ERROR },
        { status: 400 }
      );
    }

    await ensureClient(deviceClientId, {
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const questionSnapshot = buildAssessQuestionSnapshot();
    const scoreSnapshot = buildAssessScoreSnapshot(cResult);

    assertSnapshotVersion(questionSnapshot, "questionSnapshot");
    assertSnapshotVersion(scoreSnapshot, "scoreSnapshot");

    const record = await db.assessmentResult.create({
      data: {
        client: { connect: { id: deviceClientId } },
        ...(actor.appUserId
          ? { appUser: { connect: { id: actor.appUserId } } }
          : {}),
        answers: toInputJsonValue(answers),
        cResult: toInputJsonValue(pickAssessResultSummary(scoreSnapshot, cResult)),
        questionSnapshot: toInputJsonValue(questionSnapshot),
        scoreSnapshot: toInputJsonValue(scoreSnapshot),
        tzOffsetMinutes:
          typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
      },
    });

    return buildAssessSaveResponse({
      id: record.id,
      cookieToSet: actor.cookieToSet,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message ? error.message : UNKNOWN_ERROR,
      },
      { status: 500 }
    );
  }
}
