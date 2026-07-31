import type { ChatMessage, ChatMessageStatus } from "@/types/chat";
import { getClientIdLocal } from "../utils";
import { streamAssistantReply } from "./useChat.assistant";
import { CHAT_COPY } from "./useChat.copy";
import { sanitizeAssistantText } from "./useChat.text";

type StreamAssistantRuntimeContext = Parameters<typeof streamAssistantReply>[0]["runtimeContext"];

export type AssistantTurnOutcome = "complete" | "stopped" | "failed";

type RunStreamedAssistantTurnInput = {
  mode: "chat" | "init";
  sessionId: string;
  messages: ChatMessage[];
  assistantMessage: ChatMessage;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: () => StreamAssistantRuntimeContext;
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    status?: ChatMessageStatus | null
  ) => void;
  setAbortController: (controller: AbortController | null) => void;
  onComplete: (fullText: string, outcome: AssistantTurnOutcome) => Promise<void> | void;
};

function isAbortError(error: unknown) {
  return (error as { name?: string } | undefined)?.name === "AbortError";
}

/**
 * Runs one assistant turn and records how it ended.
 *
 * A turn can finish three ways and each needs different handling: a complete
 * answer is persisted and followed up, a user-stopped answer keeps whatever
 * streamed so far, and a failed answer is marked retryable and kept out of the
 * transcript sent back to the model.
 */
export async function runStreamedAssistantTurn(
  input: RunStreamedAssistantTurnInput
): Promise<AssistantTurnOutcome> {
  const controller = new AbortController();
  input.setAbortController(controller);

  let streamedText = "";

  try {
    const clientId = getClientIdLocal();
    const { text, failed } = await streamAssistantReply({
      mode: input.mode,
      messages: input.messages,
      clientId,
      contextPayload: input.buildContextPayload(input.sessionId),
      runtimeContext: input.buildRuntimeContextPayload(),
      signal: controller.signal,
      onChunk: (textSoFar) => {
        streamedText = textSoFar;
        input.updateAssistantMessage(
          input.sessionId,
          input.assistantMessage.id,
          textSoFar
        );
      },
    });

    const outcome: AssistantTurnOutcome = failed ? "failed" : "complete";
    input.updateAssistantMessage(
      input.sessionId,
      input.assistantMessage.id,
      text,
      failed ? "error" : null
    );

    // A failed turn has no answer to follow up on or persist.
    if (!failed) await input.onComplete(text, outcome);
    return outcome;
  } catch (error) {
    if (!isAbortError(error)) throw error;

    const partial = sanitizeAssistantText(streamedText, true);
    input.updateAssistantMessage(
      input.sessionId,
      input.assistantMessage.id,
      partial || CHAT_COPY.stoppedBeforeAnswer,
      "stopped"
    );
    if (partial) await input.onComplete(partial, "stopped");
    return "stopped";
  } finally {
    input.setAbortController(null);
  }
}
