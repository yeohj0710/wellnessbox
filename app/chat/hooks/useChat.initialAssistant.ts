import type { ChatMessage, ChatMessageStatus, ChatSession } from "@/types/chat";
import { uid } from "../utils";
import { toAssistantErrorText } from "./useChat.copy";
import { fillPendingAssistantError, replaceSessionMessages } from "./useChat.sessionState";
import {
  runStreamedAssistantTurn,
  type AssistantTurnOutcome,
} from "./useChat.streamTurn";

type SetSessions = (updater: (prev: ChatSession[]) => ChatSession[]) => void;

type StartInitialAssistantMessageFlowInput = {
  sessionId: string;
  sessions: ChatSession[];
  resultsLoaded: boolean;
  initStartedMap: Record<string, boolean>;
  isOnline: () => boolean;
  offlineMessage: string;
  setSessions: SetSessions;
  setLoading: (loading: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: Parameters<typeof runStreamedAssistantTurn>[0]["buildRuntimeContextPayload"];
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    status?: ChatMessageStatus | null
  ) => void;
  onComplete: (input: {
    sessionId: string;
    fullText: string;
    assistantMessage: ChatMessage;
    outcome: AssistantTurnOutcome;
  }) => Promise<void> | void;
};

export async function startInitialAssistantMessageFlow(
  input: StartInitialAssistantMessageFlowInput
) {
  if (!input.resultsLoaded) return;
  if (input.initStartedMap[input.sessionId]) return;

  input.initStartedMap[input.sessionId] = true;
  const session = input.sessions.find((item) => item.id === input.sessionId);
  if (!session || session.messages.length > 0) return;

  const now = Date.now();
  const assistantMessage: ChatMessage = {
    id: uid(),
    role: "assistant",
    content: "",
    createdAt: now,
  };

  input.setSessions((prev) =>
    replaceSessionMessages(prev, input.sessionId, [assistantMessage], now)
  );

  if (!input.isOnline()) {
    input.updateAssistantMessage(
      input.sessionId,
      assistantMessage.id,
      input.offlineMessage,
      "error"
    );
    return;
  }

  input.setLoading(true);
  try {
    await runStreamedAssistantTurn({
      mode: "init",
      sessionId: input.sessionId,
      messages: [],
      assistantMessage,
      buildContextPayload: input.buildContextPayload,
      buildRuntimeContextPayload: input.buildRuntimeContextPayload,
      updateAssistantMessage: input.updateAssistantMessage,
      setAbortController: input.setAbortController,
      onComplete: async (fullText, outcome) => {
        await input.onComplete({
          sessionId: input.sessionId,
          fullText,
          assistantMessage,
          outcome,
        });
      },
    });
  } catch (error) {
    input.setSessions((prev) =>
      fillPendingAssistantError(
        prev,
        input.sessionId,
        toAssistantErrorText(error)
      )
    );
  } finally {
    input.setLoading(false);
  }
}
