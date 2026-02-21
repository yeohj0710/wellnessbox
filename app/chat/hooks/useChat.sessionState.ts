import type { ChatMessage, ChatSession } from "@/types/chat";

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
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          updatedAt,
          messages: session.messages.map((message) =>
            message.id === messageId ? { ...message, content } : message
          ),
        }
      : session
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
              ? { ...message, content: errorText }
              : message
          ),
        }
      : session
  );
}
