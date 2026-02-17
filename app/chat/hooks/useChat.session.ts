import type { ChatSession } from "@/types/chat";

export const DEFAULT_CHAT_TITLE = "새 상담";

type ActorState = {
  loggedIn: boolean;
  appUserId: string | null;
};

type MergeServerSessionsParams = {
  prevSessions: ChatSession[];
  incomingSessions: any[];
  currentReadyMap: Record<string, boolean>;
  actor: ActorState;
  currentActiveId: string | null;
};

type MergeServerSessionsResult = {
  sessions: ChatSession[];
  nextActiveId: string | null;
  nextReadyMap: Record<string, boolean>;
};

export function createDraftSession(input: {
  id: string;
  now: number;
  actor: ActorState;
}): ChatSession {
  return {
    id: input.id,
    title: DEFAULT_CHAT_TITLE,
    createdAt: input.now,
    updatedAt: input.now,
    appUserId: input.actor.loggedIn ? input.actor.appUserId : null,
    messages: [],
  };
}

function normalizeIncomingSession(raw: any): ChatSession | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    title: raw.title || DEFAULT_CHAT_TITLE,
    createdAt: raw.createdAt ? Number(raw.createdAt) : Date.now(),
    updatedAt: raw.updatedAt ? Number(raw.updatedAt) : Date.now(),
    appUserId: raw.appUserId ?? null,
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((message: any) => ({
          id: String(message.id),
          role: message.role,
          content: message.content ?? "",
          createdAt: message.createdAt ? Number(message.createdAt) : Date.now(),
        }))
      : [],
  };
}

export function mergeServerSessions(
  params: MergeServerSessionsParams
): MergeServerSessionsResult {
  const merged = new Map<string, ChatSession>();
  const ensureReady: Record<string, boolean> = {};

  for (const session of params.prevSessions) {
    merged.set(session.id, session);
    ensureReady[session.id] = params.currentReadyMap[session.id] ?? true;
  }

  for (const raw of params.incomingSessions) {
    const normalized = normalizeIncomingSession(raw);
    if (!normalized) continue;

    const existing = merged.get(normalized.id);
    if (!existing || (existing.updatedAt || 0) < (normalized.updatedAt || 0)) {
      merged.set(normalized.id, normalized);
    }
    ensureReady[normalized.id] = true;
  }

  if (params.actor.loggedIn && params.actor.appUserId) {
    for (const [id, session] of merged.entries()) {
      if (
        !session.appUserId &&
        session.messages.length === 0 &&
        !params.currentReadyMap[id]
      ) {
        merged.set(id, {
          ...session,
          appUserId: params.actor.appUserId,
        });
      }
    }
  }

  if (params.actor.loggedIn) {
    const me = params.actor.appUserId;
    for (const [id, session] of merged.entries()) {
      if (session.appUserId && session.appUserId !== me) {
        merged.delete(id);
        delete ensureReady[id];
      }
    }
  } else {
    for (const [id, session] of merged.entries()) {
      if (session.appUserId) {
        merged.delete(id);
        delete ensureReady[id];
      }
    }
  }

  let sessions = Array.from(merged.values()).sort(
    (left, right) =>
      (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt)
  );

  if (sessions.length > 1) {
    sessions = sessions.filter(
      (session) => session.messages.length > 0 || ensureReady[session.id]
    );
  }

  const nextActiveId =
    (params.currentActiveId && merged.has(params.currentActiveId)
      ? params.currentActiveId
      : sessions[0]?.id) || null;

  return {
    sessions,
    nextActiveId,
    nextReadyMap: ensureReady,
  };
}
