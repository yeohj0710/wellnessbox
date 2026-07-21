import db from "@/lib/db";
import {
  applyActorCookie,
  parseChatSaveBody,
  resolveChatReadIdentity,
  resolveChatWriteIdentity,
} from "@/lib/chat/session-route";
import { resolveActorForRequest } from "@/lib/server/actor";
import {
  canWriteChatSession,
  resolveChatSessionTitle,
  resolveChatSessionWhere,
  serializeChatSessions,
  toChatMessageCreatedAt,
  toChatMessageRole,
  type ChatReadIdentity,
  type ChatSaveBody,
  type ChatWriteIdentity,
} from "@/lib/chat/session-route";
import { ensureClient } from "@/lib/server/client";
import { NextRequest, NextResponse } from "next/server";
import type { WbRndCounselingTurn } from "@/lib/server/wb-rnd-interim-client";
import { DEFAULT_CHAT_TITLE } from "@/lib/chat/constants";
import { createHash } from "node:crypto";

export function buildRndCounselingMessageId(sessionId: string, turnId: string) {
  return `rnd_${createHash("sha256")
    .update(`${sessionId.length}:${sessionId}${turnId.length}:${turnId}`)
    .digest("hex")}`;
}

const UNKNOWN_ERROR = "Unknown error";

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return UNKNOWN_ERROR;
}

export async function persistChatSession(input: {
  identity: ChatWriteIdentity;
  payload: ChatSaveBody;
  userAgent: string | null;
}) {
  await ensureClient(input.identity.clientId, {
    userAgent: input.userAgent,
  });

  const existingSession = await db.chatSession.findUnique({
    where: { id: input.payload.sessionId },
    select: { clientId: true, appUserId: true },
  });

  if (existingSession && !canWriteChatSession(existingSession, input.identity)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  await db.chatSession.upsert({
    where: { id: input.payload.sessionId },
    create: {
      id: input.payload.sessionId,
      clientId: input.identity.clientId,
      appUserId: input.identity.loggedIn
        ? input.identity.appUserId ?? undefined
        : undefined,
      title: resolveChatSessionTitle(input.payload.title),
      status: "active",
    },
    update: {
      title: input.payload.title || undefined,
    },
  });

  if (input.payload.messages.length > 0) {
    await db.$transaction(
      input.payload.messages.map((message) =>
        db.chatMessage.upsert({
          where: { id: message.id },
          create: {
            id: message.id,
            sessionId: input.payload.sessionId,
            role: toChatMessageRole(message.role),
            content: message.content,
            tzOffsetMinutes: input.payload.tzOffsetMinutes,
            createdAt: toChatMessageCreatedAt(message.createdAt),
          },
          update: {
            role: toChatMessageRole(message.role),
            content: message.content,
            tzOffsetMinutes: input.payload.tzOffsetMinutes,
          },
        })
      )
    );
  }

  return { ok: true as const };
}

export async function persistRndCounselingTurn(input: {
  identity: ChatWriteIdentity;
  sessionId: string;
  turn: WbRndCounselingTurn;
  userAgent: string | null;
}) {
  await ensureClient(input.identity.clientId, { userAgent: input.userAgent });
  const existing = await db.chatSession.findUnique({
    where: { id: input.sessionId },
    select: { clientId: true, appUserId: true, meta: true },
  });
  if (existing && !canWriteChatSession(existing, input.identity)) {
    throw new Error("Forbidden");
  }
  const execution = input.turn.recommendation_execution;
  const messageId = buildRndCounselingMessageId(input.sessionId, input.turn.turn_id);
  const existingMessage = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { sessionId: true },
  });
  if (existingMessage && existingMessage.sessionId !== input.sessionId) {
    throw new Error("R&D counseling message session conflict");
  }
  const rndMeta = {
    schemaVersion: "rndCounselingSessionBindingV1",
    agentRunId: input.turn.agent_run_id,
    recommendationRunId: execution?.run_id ?? null,
    recommendationStatus: execution?.status ?? null,
    simulation: execution?.simulation ?? true,
    bindingSha256: input.turn.session_binding_sha256,
  };
  await db.chatSession.upsert({
    where: { id: input.sessionId },
    create: {
      id: input.sessionId,
      clientId: input.identity.clientId,
      appUserId: input.identity.loggedIn ? input.identity.appUserId ?? undefined : undefined,
      title: DEFAULT_CHAT_TITLE,
      status: "active",
      meta: { rndCounseling: rndMeta },
    },
    update: { meta: { rndCounseling: rndMeta } },
  });
  await db.chatMessage.upsert({
    where: { id: messageId },
    create: {
      id: messageId,
      sessionId: input.sessionId,
      role: "assistant",
      content: input.turn.answer.answer_text,
      meta: { rndCounseling: rndMeta },
    },
    update: {
      content: input.turn.answer.answer_text,
      meta: { rndCounseling: rndMeta },
    },
  });
}

export async function loadChatSessions(input: { identity: ChatReadIdentity }) {
  const sessions = await db.chatSession.findMany({
    where: resolveChatSessionWhere(input.identity),
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return {
    sessions: serializeChatSessions(sessions),
    actor: {
      loggedIn: input.identity.loggedIn,
      appUserId: input.identity.appUserId,
      deviceClientId: input.identity.clientId,
      phoneLinked: input.identity.phoneLinked,
    },
  };
}

export async function runChatSavePostRoute(req: NextRequest) {
  try {
    const [rawBody, actor] = await Promise.all([
      req.json().catch(() => null),
      resolveActorForRequest(req, { intent: "write" }),
    ]);

    const identityResult = resolveChatWriteIdentity(actor);
    if (!identityResult.ok) return identityResult.response;

    const parseResult = parseChatSaveBody(rawBody);
    if (!parseResult.ok) {
      return NextResponse.json(
        { error: parseResult.error },
        { status: parseResult.status }
      );
    }

    const persisted = await persistChatSession({
      identity: identityResult.data,
      payload: parseResult.data,
      userAgent: req.headers.get("user-agent"),
    });
    if (!persisted.ok) {
      return NextResponse.json(
        { error: persisted.error },
        { status: persisted.status }
      );
    }

    return applyActorCookie(NextResponse.json({ ok: true }), actor);
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}

export async function runChatSaveGetRoute(req: NextRequest) {
  try {
    const actor = await resolveActorForRequest(req, { intent: "read" });
    const identityResult = resolveChatReadIdentity(actor);
    if (!identityResult.ok) return identityResult.response;

    const payload = await loadChatSessions({
      identity: identityResult.data,
    });

    const response = NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });

    return applyActorCookie(response, actor);
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
