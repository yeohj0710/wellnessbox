import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import db from "@/lib/db";
import {
  resolveActorForRequest,
  type RequestActor,
} from "@/lib/server/actor";
import {
  serializeAssessmentResultForRoute,
  serializeCheckAiResultForRoute,
} from "@/lib/server/result-route-serializers";

type ResultScope = {
  resultWhere: { appUserId: string } | { clientId: string };
  orderWhere:
    | { appUserId: string }
    | { endpoint: string }
    | { id: number };
  scopeMeta: {
    result: "account" | "device";
    order: "account" | "device" | "none";
  };
};

type ResolvedScope =
  | { ok: true; data: ResultScope }
  | { ok: false; response: NextResponse };

function applyActorCookie(response: NextResponse, actor: RequestActor) {
  if (!actor.cookieToSet) return response;
  response.cookies.set(
    actor.cookieToSet.name,
    actor.cookieToSet.value,
    actor.cookieToSet.options
  );
  return response;
}

export function resolveAllResultsScope(actor: RequestActor): ResolvedScope {
  const appUserId = actor.appUserId;
  const clientId = actor.deviceClientId;

  if (actor.loggedIn) {
    if (!appUserId) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Missing appUserId" }, { status: 500 }),
      };
    }
    return {
      ok: true,
      data: {
        resultWhere: { appUserId },
        orderWhere: actor.phoneLinked ? { appUserId } : { id: -1 },
        scopeMeta: {
          result: "account",
          order: actor.phoneLinked ? "account" : "none",
        },
      },
    };
  }

  if (!clientId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing clientId" }, { status: 400 }),
    };
  }

  return {
    ok: true,
    data: {
      resultWhere: { clientId },
      orderWhere: { endpoint: clientId },
      scopeMeta: {
        result: "device",
        order: "device",
      },
    },
  };
}

export async function loadAllResultsPayload(input: {
  actor: RequestActor;
  scope: ResultScope;
}) {
  const [assessRaw, checkAiRaw, orders] = await Promise.all([
    db.assessmentResult.findFirst({
      where: input.scope.resultWhere,
      orderBy: { createdAt: "desc" },
    }),
    db.checkAiResult.findFirst({
      where: input.scope.resultWhere,
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: input.scope.orderWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        orderItems: {
          include: { pharmacyProduct: { include: { product: true } } },
        },
      },
    }),
  ]);

  return {
    clientId: input.actor.deviceClientId,
    assess: serializeAssessmentResultForRoute(assessRaw, {
      includeNormalized: true,
    }),
    checkAi: serializeCheckAiResultForRoute(checkAiRaw, {
      includeNormalized: true,
    }),
    orders,
    actor: {
      loggedIn: input.actor.loggedIn,
      appUserId: input.actor.appUserId,
      deviceClientId: input.actor.deviceClientId,
      phoneLinked: input.actor.phoneLinked,
    },
    scope: input.scope.scopeMeta,
  };
}

export function buildAllResultsResponse(input: {
  actor: RequestActor;
  payload: Awaited<ReturnType<typeof loadAllResultsPayload>>;
}) {
  return applyActorCookie(NextResponse.json(input.payload), input.actor);
}

export function buildAllResultsErrorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 }
  );
}

export async function runAllResultsGetRoute(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const scopeResult = resolveAllResultsScope(actor);
    if (!scopeResult.ok) return scopeResult.response;

    const payload = await loadAllResultsPayload({
      actor,
      scope: scopeResult.data,
    });
    return buildAllResultsResponse({ actor, payload });
  } catch (error) {
    return buildAllResultsErrorResponse(error);
  }
}
