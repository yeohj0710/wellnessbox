import "server-only";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";
import { ensureClient } from "@/lib/server/client";
import {
  assertSnapshotVersion,
  buildCheckAiQuestionSnapshot,
  buildCheckAiScoreSnapshot,
  pickCheckAiResultSummary,
} from "@/lib/server/result-normalizer";

const MISSING_CLIENT_ID_ERROR = "Missing clientId";
const MISSING_RESULT_ERROR = "Missing result";
const UNKNOWN_ERROR = "Unknown error";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function resolveCheckAiAnswersToStore(answers: unknown) {
  if (answers === undefined) return undefined;
  if (answers === null) return Prisma.JsonNull;
  return toInputJsonValue(answers);
}

function buildCheckAiSaveResponse(input: {
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

export async function runCheckAiSaveRoute(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = await resolveActorForRequest(req, {
      intent: "write",
    });

    const {
      result,
      answers,
      tzOffsetMinutes,
      questionSnapshot: incomingQuestionSnapshot,
    } = body || {};

    const deviceClientId = actor.deviceClientId;
    if (!deviceClientId) {
      return NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 500 });
    }
    if (!result) {
      return NextResponse.json({ error: MISSING_RESULT_ERROR }, { status: 400 });
    }

    await ensureClient(deviceClientId, {
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const questionSnapshot = buildCheckAiQuestionSnapshot(
      incomingQuestionSnapshot
    );
    const scoreSnapshot = buildCheckAiScoreSnapshot(result);

    assertSnapshotVersion(questionSnapshot, "questionSnapshot");
    assertSnapshotVersion(scoreSnapshot, "scoreSnapshot");

    const record = await db.checkAiResult.create({
      data: {
        clientId: deviceClientId,
        appUserId: actor.appUserId ?? undefined,
        result: toInputJsonValue(pickCheckAiResultSummary(result)),
        ...(resolveCheckAiAnswersToStore(answers) !== undefined
          ? { answers: resolveCheckAiAnswersToStore(answers) }
          : {}),
        questionSnapshot: toInputJsonValue(questionSnapshot),
        scoreSnapshot: toInputJsonValue(scoreSnapshot),
        tzOffsetMinutes:
          typeof tzOffsetMinutes === "number" ? tzOffsetMinutes : 0,
      },
    });

    return buildCheckAiSaveResponse({
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
