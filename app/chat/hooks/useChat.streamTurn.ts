import type { ChatMessage } from "@/types/chat";
import { getClientIdLocal } from "../utils";
import { streamAssistantReply } from "./useChat.assistant";

type StreamAssistantRuntimeContext = Parameters<typeof streamAssistantReply>[0]["runtimeContext"];

type RunStreamedAssistantTurnInput = {
  mode: "chat" | "init";
  sessionId: string;
  messages: ChatMessage[];
  assistantMessage: ChatMessage;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: () => StreamAssistantRuntimeContext;
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  onComplete: (fullText: string) => Promise<void> | void;
};

export async function runStreamedAssistantTurn(
  input: RunStreamedAssistantTurnInput
) {
  const controller = new AbortController();
  input.setAbortController(controller);
  try {
    const clientId = getClientIdLocal();
    const fullText = await streamAssistantReply({
      mode: input.mode,
      messages: input.messages,
      clientId,
      contextPayload: input.buildContextPayload(input.sessionId),
      runtimeContext: input.buildRuntimeContextPayload(),
      signal: controller.signal,
      onChunk: (textSoFar) => {
        input.updateAssistantMessage(
          input.sessionId,
          input.assistantMessage.id,
          textSoFar
        );
      },
    });

    input.updateAssistantMessage(input.sessionId, input.assistantMessage.id, fullText);
    await input.onComplete(fullText);
  } finally {
    input.setAbortController(null);
  }
}
