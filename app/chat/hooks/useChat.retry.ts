import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatMessageStatus, ChatSession } from "@/types/chat";
import type { FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";
import { patchSessionMessage } from "./useChat.sessionState";
import { runStreamedAssistantTurn } from "./useChat.streamTurn";
import { toModelTranscript } from "./useChat.transcript";

type CreateRetryHandlerInput = {
  active: ChatSession | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  stickToBottomRef: MutableRefObject<boolean>;
  clearFollowups: () => void;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: Parameters<
    typeof runStreamedAssistantTurn
  >[0]["buildRuntimeContextPayload"];
  abortRef: MutableRefObject<AbortController | null>;
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    status?: ChatMessageStatus | null
  ) => void;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  toAssistantErrorText: (error: unknown) => string;
};

/**
 * Re-runs the most recent assistant turn in place.
 *
 * The turn is replayed into the same message so the transcript keeps its shape:
 * the user's question is not duplicated, and a retry that fails again simply
 * lands back in the error state instead of stacking bubbles.
 */
export function createRetryHandler(deps: CreateRetryHandlerInput) {
  return async function retryLastAssistantTurn() {
    if (deps.loading) return;

    const session = deps.active;
    if (!session) return;

    const messages = session.messages;
    const lastIndex = messages.length - 1;
    const assistantMessage = messages[lastIndex];
    if (!assistantMessage || assistantMessage.role !== "assistant") return;
    if (assistantMessage.status !== "error" && assistantMessage.status !== "stopped") {
      return;
    }

    const sessionId = session.id;
    const priorMessages = messages.slice(0, lastIndex);
    const userMessage =
      priorMessages[priorMessages.length - 1]?.role === "user"
        ? priorMessages[priorMessages.length - 1]
        : undefined;
    // The opening briefing has no preceding user turn, so it replays as `init`.
    const mode = priorMessages.length === 0 ? "init" : "chat";

    deps.clearFollowups();
    deps.setSessions((prev) =>
      patchSessionMessage(prev, sessionId, assistantMessage.id, {
        content: "",
        status: null,
      })
    );
    deps.stickToBottomRef.current = true;
    deps.setLoading(true);

    try {
      await runStreamedAssistantTurn({
        mode,
        sessionId,
        messages: mode === "init" ? [] : toModelTranscript(priorMessages),
        assistantMessage,
        buildContextPayload: deps.buildContextPayload,
        buildRuntimeContextPayload: deps.buildRuntimeContextPayload,
        updateAssistantMessage: deps.updateAssistantMessage,
        setAbortController: (controller) => {
          deps.abortRef.current = controller;
        },
        onComplete: async (fullText, outcome) => {
          await deps.finalizeAssistantTurn({
            sessionId,
            content: fullText,
            assistantMessage,
            userMessage,
            isFirst: priorMessages.length === 2,
            outcome,
          });
        },
      });
    } catch (error) {
      deps.updateAssistantMessage(
        sessionId,
        assistantMessage.id,
        deps.toAssistantErrorText(error),
        "error"
      );
    } finally {
      deps.setLoading(false);
    }
  };
}
