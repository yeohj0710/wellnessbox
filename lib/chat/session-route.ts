import "server-only";

import type { ChatRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CHAT_MESSAGE_CONTENT_MAX_LENGTH,
  CHAT_SAVE_MESSAGE_LIMIT,
  CHAT_SESSION_ID_MAX_LENGTH,
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_CHAT_TITLE,
} from "@/lib/chat/constants";
import type { RequestActor } from "@/lib/server/actor";

const CHAT_ROLE_VALUES = ["system", "user", "assistant"] as const;
const MISSING_SESSION_ID_ERROR = "Missing sessionId";
const MISSING_CLIENT_ID_ERROR = "Missing clientId";
const MISSING_APP_USER_ID_ERROR = "Missing appUserId";

const saveMessageSchema = z.object({
  id: z.string().trim().min(1).max(CHAT_SESSION_ID_MAX_LENGTH),
  role: z.enum(CHAT_ROLE_VALUES),
  content: z.string().max(CHAT_MESSAGE_CONTENT_MAX_LENGTH),
  createdAt: z.number().int().positive().optional(),
});

const saveBodySchema = z.object({
  sessionId: z.string().trim().min(1).max(CHAT_SESSION_ID_MAX_LENGTH),
  title: z.string().trim().max(CHAT_TITLE_MAX_LENGTH).optional(),
  messages: z.array(saveMessageSchema).max(CHAT_SAVE_MESSAGE_LIMIT).default([]),
  tzOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

const deleteBodySchema = z.object({
  sessionId: z.string().trim().min(1).max(CHAT_SESSION_ID_MAX_LENGTH),
});

export type ChatSaveMessageInput = z.infer<typeof saveMessageSchema>;

export type ChatSaveBody = {
  sessionId: string;
  title?: string;
  messages: ChatSaveMessageInput[];
  tzOffsetMinutes: number;
};

type ParseBodyError = {
  ok: false;
  error: string;
  status: number;
};

type ParseBodySuccess<TBody> = {
  ok: true;
  data: TBody;
};

export type ChatWriteIdentity = {
  clientId: string;
  appUserId: string | null;
  loggedIn: boolean;
};

export type ChatReadIdentity = {
  clientId: string | null;
  appUserId: string | null;
  loggedIn: boolean;
  phoneLinked: boolean;
};

type ChatSessionOwner = {
  clientId: string;
  appUserId: string | null;
};

type ChatSessionWithMessages = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  appUserId: string | null;
  messages: Array<{
    id: string;
    role: ChatRole;
    content: string;
    createdAt: Date;
  }>;
};

function readSessionIdFromUnknown(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const sessionId = (raw as { sessionId?: unknown }).sessionId;
  return typeof sessionId === "string" ? sessionId.trim() : "";
}

function withInvalidBodyFallback(raw: unknown, fallbackError: string): ParseBodyError {
  if (!readSessionIdFromUnknown(raw)) {
    return { ok: false, error: MISSING_SESSION_ID_ERROR, status: 400 };
  }
  return { ok: false, error: fallbackError, status: 400 };
}

export function parseChatSaveBody(raw: unknown): ParseBodySuccess<ChatSaveBody> | ParseBodyError {
  const parsed = saveBodySchema.safeParse(raw);
  if (!parsed.success) {
    return withInvalidBodyFallback(raw, "Invalid request body");
  }
  return {
    ok: true,
    data: {
      sessionId: parsed.data.sessionId,
      title: parsed.data.title || undefined,
      messages: parsed.data.messages,
      tzOffsetMinutes: parsed.data.tzOffsetMinutes ?? 0,
    },
  };
}

export function parseChatDeleteBody(raw: unknown): ParseBodySuccess<{ sessionId: string }> | ParseBodyError {
  const parsed = deleteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return withInvalidBodyFallback(raw, MISSING_SESSION_ID_ERROR);
  }
  return {
    ok: true,
    data: {
      sessionId: parsed.data.sessionId,
    },
  };
}

export function resolveChatWriteIdentity(
  actor: RequestActor
): ParseBodySuccess<ChatWriteIdentity> | { ok: false; response: NextResponse } {
  if (!actor.deviceClientId) {
    return {
      ok: false,
      response: NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 500 }),
    };
  }
  if (actor.loggedIn && !actor.appUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: MISSING_APP_USER_ID_ERROR }, { status: 500 }),
    };
  }
  return {
    ok: true,
    data: {
      clientId: actor.deviceClientId,
      appUserId: actor.appUserId,
      loggedIn: actor.loggedIn,
    },
  };
}

export function resolveChatReadIdentity(
  actor: RequestActor
): ParseBodySuccess<ChatReadIdentity> | { ok: false; response: NextResponse } {
  if (!actor.deviceClientId && !actor.appUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: MISSING_CLIENT_ID_ERROR }, { status: 400 }),
    };
  }
  if (actor.loggedIn && !actor.appUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: MISSING_APP_USER_ID_ERROR }, { status: 500 }),
    };
  }
  return {
    ok: true,
    data: {
      loggedIn: actor.loggedIn,
      clientId: actor.deviceClientId,
      appUserId: actor.appUserId,
      phoneLinked: actor.phoneLinked,
    },
  };
}

export function canWriteChatSession(
  sessionOwner: ChatSessionOwner,
  actor: ChatWriteIdentity
) {
  if (sessionOwner.appUserId) {
    return actor.loggedIn && sessionOwner.appUserId === actor.appUserId;
  }
  return sessionOwner.clientId === actor.clientId;
}

export function resolveChatSessionTitle(title: string | undefined) {
  return title || DEFAULT_CHAT_TITLE;
}

export function resolveChatSessionWhere(
  actor: ChatReadIdentity
): Prisma.ChatSessionWhereInput {
  if (!actor.loggedIn) {
    return { clientId: actor.clientId ?? "", appUserId: null };
  }
  return {
    OR: [
      actor.appUserId ? { appUserId: actor.appUserId } : { id: "missing" },
      actor.clientId ? { clientId: actor.clientId, appUserId: null } : { id: "missing" },
    ],
  };
}

export function toChatMessageRole(role: ChatSaveMessageInput["role"]): ChatRole {
  return role;
}

export function toChatMessageCreatedAt(createdAt: number | undefined) {
  if (typeof createdAt !== "number") return undefined;
  const normalized = new Date(createdAt);
  return Number.isNaN(normalized.getTime()) ? undefined : normalized;
}

export function serializeChatSessions(sessions: ChatSessionWithMessages[]) {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.getTime(),
    updatedAt: session.updatedAt.getTime(),
    appUserId: session.appUserId,
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.getTime(),
    })),
  }));
}

export function applyActorCookie(
  response: NextResponse,
  actor: Pick<RequestActor, "cookieToSet">
) {
  if (!actor.cookieToSet) return response;
  response.cookies.set(
    actor.cookieToSet.name,
    actor.cookieToSet.value,
    actor.cookieToSet.options
  );
  return response;
}
