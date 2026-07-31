import type { ChatMessage, ChatMessageStatus, ChatSession } from "@/types/chat";

export type ChatMessagePatch = {
  content?: string;
  /** `null` clears the status back to a normal, complete turn. */
  status?: ChatMessageStatus | null;
};

export function patchSessionMessage(
  sessions: ChatSession[],
  sessionId: string,
  messageId: string,
  patch: ChatMessagePatch,
  updatedAt: number = Date.now()
) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          updatedAt,
          messages: session.messages.map((message) => {
            if (message.id !== messageId) return message;

            const next: ChatMessage = { ...message };
            if (patch.content !== undefined) next.content = patch.content;
            if (patch.status === null) delete next.status;
            else if (patch.status !== undefined) next.status = patch.status;
            return next;
          }),
        }
      : session
  );
}

export function updateSessionTitle(
  sessions: ChatSession[],
  sessionId: string,
  title: string
) {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, title } : session
  );
}

export function replaceSessionMessageContent(
  sessions: ChatSession[],
  sessionId: string,
  messageId: string,
  content: string,
  updatedAt: number = Date.now()
) {
  return patchSessionMessage(
    sessions,
    sessionId,
    messageId,
    { content },
    updatedAt
  );
}

export function appendMessagesToSession(
  sessions: ChatSession[],
  sessionId: string,
  messages: ChatMessage[],
  updatedAt: number = Date.now()
) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          updatedAt,
          messages: [...session.messages, ...messages],
        }
      : session
  );
}

export function replaceSessionMessages(
  sessions: ChatSession[],
  sessionId: string,
  messages: ChatMessage[],
  updatedAt: number = Date.now()
) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          updatedAt,
          messages,
        }
      : session
  );
}

export function fillPendingAssistantError(
  sessions: ChatSession[],
  sessionId: string,
  errorText: string,
  updatedAt: number = Date.now()
) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          updatedAt,
          messages: session.messages.map((message) =>
            message.role === "assistant" && message.content === ""
              ? { ...message, content: errorText, status: "error" as const }
              : message
          ),
        }
      : session
  );
}
