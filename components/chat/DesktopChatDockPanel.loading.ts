import type { ChatMessage } from "@/types/chat";

export type AssistantLoadingMeta = {
  contextText: string;
};

export function buildAssistantLoadingMetaMap(messages: ChatMessage[]) {
  const meta = new Map<number, AssistantLoadingMeta>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role === "assistant") {
      let contextText = "";
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const prev = messages[cursor];
        if (prev.role !== "user") continue;
        if (typeof prev.content !== "string") continue;
        const text = prev.content.trim();
        if (!text) continue;
        contextText = text;
        break;
      }
      meta.set(index, {
        contextText,
      });
    }
  }

  return meta;
}
