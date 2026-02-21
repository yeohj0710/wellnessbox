import type { ChatSession } from "@/types/chat";
import { uid } from "../utils";
import { createDraftSession } from "./useChat.session";

type SessionActor = {
  loggedIn: boolean;
  appUserId: string | null;
};

type CreateNewChatResult = {
  id: string;
  session: ChatSession;
  nextSessions: ChatSession[];
};

export function createNewChatSession(input: {
  sessions: ChatSession[];
  actor: SessionActor;
  now?: number;
}): CreateNewChatResult {
  const id = uid();
  const now = input.now ?? Date.now();
  const session = createDraftSession({
    id,
    now,
    actor: input.actor,
  });

  return {
    id,
    session,
    nextSessions: [session, ...input.sessions],
  };
}

export function deleteChatSessionState(input: {
  sessions: ChatSession[];
  activeId: string | null;
  deleteId: string;
}) {
  const nextSessions = input.sessions.filter(
    (session) => session.id !== input.deleteId
  );
  const nextActiveId =
    input.activeId === input.deleteId ? (nextSessions[0]?.id ?? null) : input.activeId;

  return {
    nextSessions,
    nextActiveId,
  };
}
