import { NextRequest, NextResponse } from "next/server";
import { streamChat } from "@/lib/ai/chain";
import { applyActorCookie } from "@/lib/chat/session-route";
import type { RequestActor } from "@/lib/server/actor";
import { resolveActorForRequest } from "@/lib/server/actor";
import type { ChatRequestBody } from "@/types/chat";
import {
  callWbRndCounselingTurn,
  isWbRndInterimEnabled,
  pseudonymizeInterimSubjectId,
} from "@/lib/server/wb-rnd-interim-client";
import {
  CHAT_STREAM_FAILURE_MARKER,
  CHAT_STREAM_MESSAGES,
} from "@/lib/chat/stream-protocol";
import { persistRndCounselingTurn } from "./save/route-service";

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const SMOKE_TEST_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
} as const;

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function withPatchedChatBody(rawBody: unknown, actor: RequestActor): ChatRequestBody {
  const body = asRecord(rawBody);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  const normalizedMessages =
    incomingMessages.length > 0
      ? incomingMessages
      : question
      ? [{ role: "user", content: question }]
      : [];

  return {
    ...body,
    clientId: actor.deviceClientId ?? undefined,
    appUserId: actor.appUserId ?? undefined,
    actorContext: {
      loggedIn: actor.loggedIn,
      phoneLinked: actor.phoneLinked,
    },
    messages: normalizedMessages,
    ragQuery: question,
  } as ChatRequestBody;
}

/**
 * Upstream failures carry provider payloads, model ids and occasionally request
 * details. None of that belongs in a counseling transcript, so the raw error is
 * logged server-side and the user only ever sees fixed Korean copy.
 */
function logStreamFailure(error: unknown) {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
      ? error
      : String(error ?? "unknown");
  console.error("[chat:stream] turn failed", detail);
}

function setActorCookie(response: NextResponse, actor: RequestActor) {
  return applyActorCookie(response, actor);
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item.trim())
    : [];
}

export function buildRndCounselingProfile(
  rawProfile: unknown,
  goals: string[]
) {
  const profile = asRecord(rawProfile);
  const result: Record<string, unknown> = { goals };
  if (typeof profile.age === "number" && Number.isFinite(profile.age)) {
    result.age = profile.age;
  }
  if (typeof profile.sex === "string" && ["male", "female", "other"].includes(profile.sex)) {
    result.biological_sex = profile.sex;
  }
  if (typeof profile.pregnantOrBreastfeeding === "boolean") {
    result.pregnant = profile.pregnantOrBreastfeeding;
    result.lactating = profile.pregnantOrBreastfeeding;
  }
  return result;
}

export function buildRndCounselingSafety(
  rawSafety: unknown,
  rawProfile?: unknown
) {
  const safety = asRecord(rawSafety);
  const profile = asRecord(rawProfile);
  const result: Record<string, unknown> = {};
  for (const key of [
    "pregnant",
    "lactating",
    "above_ul",
    "requires_test",
    "timing_conflict",
    "label_constraint_violation",
  ] as const) {
    if (typeof safety[key] === "boolean") result[key] = safety[key];
  }
  if (
    [profile.conditions, profile.medications, profile.allergies].some(
      (value) => Array.isArray(value) && value.length > 0
    )
  ) {
    result.requires_test = true;
  }
  return result;
}

async function runRndCounseling(input: {
  body: ChatRequestBody;
  actor: RequestActor;
  userAgent: string | null;
}) {
  const body = asRecord(input.body);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = [...messages].reverse().find((message) => asRecord(message).role === "user");
  const lastMessage = asRecord(last);
  const query =
    typeof lastMessage.content === "string" ? String(lastMessage.content).trim() : "";
  if (!sessionId || !query) return null;
  const subject = input.actor.appUserId ?? input.actor.deviceClientId;
  if (!subject || !input.actor.deviceClientId) throw new Error("Missing chat actor identity");
  const profile = asRecord(body.profile);
  const goals = stringList(profile.goals).length
    ? stringList(profile.goals)
    : stringList(body.localAssessCats).length
    ? stringList(body.localAssessCats)
    : ["general_wellness"];
  const turnId = typeof lastMessage.id === "string" ? lastMessage.id.trim() : "";
  const createdAt = lastMessage.createdAt;
  const answeredAt =
    typeof createdAt === "number"
      ? new Date(createdAt)
      : typeof createdAt === "string"
      ? new Date(createdAt)
      : null;
  if (!turnId || !answeredAt || Number.isNaN(answeredAt.getTime())) return null;
  const turn = await callWbRndCounselingTurn({
    schema_version: "counseling_turn_request_v1",
    service_session_id: sessionId,
    turn_id: turnId,
    profile_id: pseudonymizeInterimSubjectId(subject),
    query,
    answered_at: answeredAt.toISOString(),
    profile: buildRndCounselingProfile(profile, goals),
    consent_scopes: ["simulation:write"],
    goals,
    ingredients: stringList(body.ingredients),
    safety: buildRndCounselingSafety(body.safety, profile),
  });
  if (turn.service_session_id !== sessionId || turn.turn_id !== turnId) {
    throw new Error("WB_RND_COUNSELING_session_binding_mismatch");
  }
  await persistRndCounselingTurn({
    identity: {
      clientId: input.actor.deviceClientId,
      appUserId: input.actor.appUserId,
      loggedIn: input.actor.loggedIn,
    },
    sessionId,
    turn,
    userAgent: input.userAgent,
  });
  return turn.answer.answer_text;
}

export function validateChatRouteActor(actor: RequestActor) {
  if (actor.loggedIn && !actor.appUserId) {
    return NextResponse.json({ error: "Missing appUserId" }, { status: 500 });
  }
  if (!actor.loggedIn && !actor.deviceClientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }
  return null;
}

export function buildSmokeTestResponse(actor: RequestActor) {
  return setActorCookie(
    new NextResponse("ok", {
      headers: SMOKE_TEST_HEADERS,
    }),
    actor
  );
}

export function buildSmokeTestForbiddenResponse() {
  return NextResponse.json({ error: "Smoke test disabled" }, { status: 403 });
}

export async function buildChatStreamResponse(input: {
  rawBody: unknown;
  actor: RequestActor;
  headers: Headers;
}) {
  const patchedBody = withPatchedChatBody(input.rawBody, input.actor);
  // Set when the reader goes away - reload, navigation, or the user hitting
  // stop. Writing to a cancelled controller throws, so every write is gated.
  let clientGone = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let wroteToken = false;

      const write = (text: string) => {
        if (clientGone || !text) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          clientGone = true;
        }
      };
      const fail = (message: string) => {
        write(`${message}${CHAT_STREAM_FAILURE_MARKER}`);
      };

      try {
        // Flush stream headers quickly while upstream context/model bootstraps.
        write("\u200b");
        const rndAnswer =
          isWbRndInterimEnabled() && process.env.NODE_ENV !== "production"
          ? await runRndCounseling({
              body: patchedBody,
              actor: input.actor,
              userAgent: input.headers.get("user-agent"),
            })
          : null;
        const iterable = rndAnswer
          ? (async function* () {
              yield rndAnswer;
            })()
          : ((await streamChat(patchedBody, input.headers)) as AsyncIterable<string>);

        for await (const token of iterable) {
          if (token == null) continue;
          if (clientGone) break;
          write(String(token));
          wroteToken = true;
        }
      } catch (error) {
        // A reader that went away is not a failure worth reporting.
        if (!clientGone) {
          logStreamFailure(error);
          // A partially streamed answer stays on screen; the marker tells the
          // client this turn is incomplete and should offer a retry.
          fail(wroteToken ? "" : CHAT_STREAM_MESSAGES.failure);
        }
        wroteToken = true;
      } finally {
        // An empty body used to render as a loading bubble that never resolved.
        if (!wroteToken) fail(CHAT_STREAM_MESSAGES.empty);
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      clientGone = true;
    },
  });

  return setActorCookie(
    new NextResponse(stream, {
      headers: STREAM_HEADERS,
    }),
    input.actor
  );
}

export function buildChatRouteUnhandledErrorResponse(error: unknown) {
  const message =
    error instanceof Error && error.message ? error.message : "Unknown error";
  return new NextResponse(message, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function runChatPostRoute(req: NextRequest) {
  try {
    const [body, actor] = await Promise.all([
      req.json(),
      resolveActorForRequest(req, { intent: "write" }),
    ]);

    const actorError = validateChatRouteActor(actor);
    if (actorError) return actorError;

    const smokeRequested = req.headers.get("x-smoke-test") === "1";
    const allowSmoke = smokeRequested && process.env.NODE_ENV !== "production";
    if (smokeRequested && !allowSmoke) {
      return buildSmokeTestForbiddenResponse();
    }
    if (allowSmoke) {
      return buildSmokeTestResponse(actor);
    }

    return buildChatStreamResponse({
      rawBody: body,
      actor,
      headers: req.headers,
    });
  } catch (error) {
    return buildChatRouteUnhandledErrorResponse(error);
  }
}
