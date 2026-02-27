import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { resolveActorForRequest } from "@/lib/server/actor";
import { ensureClient } from "@/lib/server/client";
import { getLatestResultsByScope } from "@/lib/server/results";

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

function resolveLatestResultsScope(actor: Awaited<ReturnType<typeof resolveActorForRequest>>) {
  if (actor.loggedIn) {
    if (!actor.appUserId) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: MISSING_APP_USER_ID_ERROR },
          { status: 500 }
        ),
      };
    }
    return { ok: true as const, scope: { appUserId: actor.appUserId } };
  }

  if (!actor.deviceClientId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 400 }),
    };
  }
  return { ok: true as const, scope: { clientId: actor.deviceClientId } };
}

export async function runUserLatestResultsGetRoute(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const resolvedScope = resolveLatestResultsScope(actor);
    if (!resolvedScope.ok) return resolvedScope.response;

    if (actor.deviceClientId) {
      await ensureClient(actor.deviceClientId, {
        userAgent: req.headers.get("user-agent"),
      });
    }

    const results = await getLatestResultsByScope(resolvedScope.scope);
    const response = NextResponse.json({
      clientId: actor.deviceClientId,
      results,
    });

    return applyActorCookie(response, actor.cookieToSet);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
