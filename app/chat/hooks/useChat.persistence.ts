import type { ChatMessage, ChatSession } from "@/types/chat";
import { requestSaveChatSession } from "./useChat.api";

type SaveChatOnceInput = {
  savedKeys: Set<string>;
  clientId: string;
  sessionId: string;
  title?: string;
  messages: ChatMessage[];
  tzOffsetMinutes: number;
};

function buildSaveKey(sessionId: string, messages: ChatMessage[]) {
  return `${sessionId}:${messages.map((message) => message.id).join(",")}`;
}

export function filterPersistableSessions(
  sessions: ChatSession[],
  readyMap: Record<string, boolean>
) {
  return sessions.filter((session) => {
    const first = session.messages[0];
    if (first && first.role === "assistant") {
      return !!readyMap[session.id];
    }
    return true;
  });
}

export async function saveChatOnce(input: SaveChatOnceInput) {
  const key = buildSaveKey(input.sessionId, input.messages);
  if (input.savedKeys.has(key)) return;

  input.savedKeys.add(key);
  await requestSaveChatSession({
    clientId: input.clientId,
    sessionId: input.sessionId,
    title: input.title,
    messages: input.messages,
    tzOffsetMinutes: input.tzOffsetMinutes,
  });
}
