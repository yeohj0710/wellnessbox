import type { ChatActionType } from "@/lib/chat/agent-actions";
import { rememberActionMemoryList } from "./useChat.actionMemory";
import { replaceSessionMessageContent } from "./useChat.sessionState";
import type { UseChatState } from "./useChat.state";

export function rememberExecutedActions(
  actions: ChatActionType[],
  setActionMemory: UseChatState["setActionMemory"]
) {
  if (!Array.isArray(actions) || actions.length === 0) return;
  setActionMemory((prev) => rememberActionMemoryList(actions, prev));
}

export function clearFollowups(
  setSuggestions: UseChatState["setSuggestions"],
  setInteractiveActions: UseChatState["setInteractiveActions"]
) {
  setSuggestions([]);
  setInteractiveActions([]);
}

export function updateAssistantMessage(
  setSessions: UseChatState["setSessions"],
  sessionId: string,
  messageId: string,
  content: string
) {
  setSessions((prev) =>
    replaceSessionMessageContent(prev, sessionId, messageId, content)
  );
}
