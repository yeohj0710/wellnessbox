import "server-only";

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  serializeAssessmentResultForRoute,
  serializeCheckAiResultForRoute,
} from "@/lib/server/result-route-serializers";

type ActorCookie = Awaited<
  ReturnType<typeof resolveActorForRequest>
>["cookieToSet"];

const UNKNOWN_ERROR = "Unknown error";
const MISSING_APP_USER_ID_ERROR = "Missing appUserId";
const MISSING_CLIENT_ID_ERROR = "Missing clientId";

function applyActorCookie(response: NextResponse, cookieToSet: ActorCookie) {
  if (!cookieToSet) return response;
  response.cookies.set(
    cookieToSet.name,
    cookieToSet.value,
    cookieToSet.options
  );
  return response;
}

export async function runLatestResultsGetRoute(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const appUserId = actor.appUserId;
    const clientId = actor.deviceClientId;

    const scope = actor.loggedIn
      ? appUserId
        ? { appUserId }
        : null
      : clientId
      ? { clientId }
      : null;

    if (actor.loggedIn && !appUserId) {
      return NextResponse.json({ error: MISSING_APP_USER_ID_ERROR }, { status: 500 });
    }
    if (!scope) {
      return NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 400 });
    }

    const [assessRaw, checkAiRaw] = await Promise.all([
      db.assessmentResult.findFirst({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
      db.checkAiResult.findFirst({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const response = NextResponse.json({
      assess: serializeAssessmentResultForRoute(assessRaw),
      checkAi: serializeCheckAiResultForRoute(checkAiRaw),
    });
    return applyActorCookie(response, actor.cookieToSet);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
