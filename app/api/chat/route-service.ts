import { NextRequest, NextResponse } from "next/server";
import { streamChat } from "@/lib/ai/chain";
import { applyActorCookie } from "@/lib/chat/session-route";
import type { RequestActor } from "@/lib/server/actor";
import { resolveActorForRequest } from "@/lib/server/actor";
import type { ChatRequestBody } from "@/types/chat";

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const SMOKE_TEST_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
} as const;

const CHAT_STREAM_FALLBACK_MESSAGE =
  "\uC751\uB2F5\uC744 \uC900\uBE44\uD558\uB294 \uC911 \uC77C\uC2DC\uC801\uC778 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

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

function toSafeStreamErrorMessage(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : String(error ?? "");
  const safe = raw.replace(/[{}]/g, (char) => (char === "{" ? "(" : ")"));
  return safe || CHAT_STREAM_FALLBACK_MESSAGE;
}

function setActorCookie(response: NextResponse, actor: RequestActor) {
  return applyActorCookie(response, actor);
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let wroteToken = false;

      try {
        // Flush stream headers quickly while upstream context/model bootstraps.
        controller.enqueue(encoder.encode("\u200b"));
        const iterable = (await streamChat(
          patchedBody,
          input.headers
        )) as AsyncIterable<string>;

        for await (const token of iterable) {
          if (token == null) continue;
          controller.enqueue(encoder.encode(String(token)));
          wroteToken = true;
        }
      } catch (error) {
        controller.enqueue(encoder.encode(toSafeStreamErrorMessage(error)));
      } finally {
        if (!wroteToken) controller.enqueue(encoder.encode(" "));
        controller.close();
      }
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
