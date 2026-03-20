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
import { loadLatestNhisChatContext } from "@/lib/server/hyphen/chat-context";

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

const CHAT_SESSION_INCLUDE = {
  id: true,
  title: true,
  updatedAt: true,
  messages: {
    orderBy: { createdAt: "asc" as const },
    select: {
      role: true,
      content: true,
    },
  },
};

const USER_PROFILE_SELECT = {
  data: true,
};

const ASSESSMENT_RESULT_SELECT = {
  id: true,
  answers: true,
  cResult: true,
  questionSnapshot: true,
  scoreSnapshot: true,
  tzOffsetMinutes: true,
  createdAt: true,
};

const CHECK_AI_RESULT_SELECT = {
  id: true,
  result: true,
  questionSnapshot: true,
  scoreSnapshot: true,
  tzOffsetMinutes: true,
  createdAt: true,
  answers: true,
};

const ORDER_SUMMARY_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  orderItems: {
    select: {
      quantity: true,
      pharmacyProduct: {
        select: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
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
  const chatSessionWhere = input.actor.loggedIn
    ? {
        OR: [
          input.actor.appUserId ? { appUserId: input.actor.appUserId } : { id: "missing" },
          input.actor.deviceClientId
            ? { clientId: input.actor.deviceClientId, appUserId: null }
            : { id: "missing" },
        ],
      }
    : input.actor.deviceClientId
    ? { clientId: input.actor.deviceClientId, appUserId: null }
    : null;
  const healthLinkAppUserId =
    input.actor.appUserId ??
    (input.actor.deviceClientId
      ? (
          await db.appUser.findUnique({
            where: { kakaoId: `guest:cid:${input.actor.deviceClientId}` },
            select: { id: true },
          })
        )?.id ??
        null
      : null);

  const [profile, assessRaw, checkAiRaw, orders, healthLink, chatSessions] =
    await Promise.all([
      input.actor.deviceClientId
        ? db.userProfile.findUnique({
            where: { clientId: input.actor.deviceClientId },
            select: USER_PROFILE_SELECT,
          })
        : Promise.resolve(null),
    db.assessmentResult.findFirst({
      where: input.scope.resultWhere,
      orderBy: { createdAt: "desc" },
      select: ASSESSMENT_RESULT_SELECT,
    }),
    db.checkAiResult.findFirst({
      where: input.scope.resultWhere,
      orderBy: { createdAt: "desc" },
      select: CHECK_AI_RESULT_SELECT,
    }),
    db.order.findMany({
      where: input.scope.orderWhere,
      orderBy: { updatedAt: "desc" },
      select: ORDER_SUMMARY_SELECT,
    }),
    healthLinkAppUserId
      ? loadLatestNhisChatContext(healthLinkAppUserId)
      : Promise.resolve(null),
    chatSessionWhere
      ? db.chatSession.findMany({
          where: chatSessionWhere,
          orderBy: { updatedAt: "desc" },
          select: CHAT_SESSION_INCLUDE,
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return {
    clientId: input.actor.deviceClientId,
    profile: profile?.data ?? null,
    assess: serializeAssessmentResultForRoute(assessRaw, {
      includeNormalized: true,
    }),
    checkAi: serializeCheckAiResultForRoute(checkAiRaw, {
      includeNormalized: true,
    }),
    healthLink,
    orders,
    chatSessions: chatSessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    })),
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
