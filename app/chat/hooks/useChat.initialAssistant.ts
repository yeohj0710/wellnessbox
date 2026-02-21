import type { ChatMessage, ChatSession } from "@/types/chat";
import { uid } from "../utils";
import { fillPendingAssistantError, replaceSessionMessages } from "./useChat.sessionState";
import { runStreamedAssistantTurn } from "./useChat.streamTurn";

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
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  onComplete: (input: {
    sessionId: string;
    fullText: string;
    assistantMessage: ChatMessage;
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
      input.offlineMessage
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
      onComplete: async (fullText) => {
        await input.onComplete({
          sessionId: input.sessionId,
          fullText,
          assistantMessage,
        });
      },
    });
  } catch (error) {
    if ((error as any)?.name !== "AbortError") {
      const errText = (error as Error).message || "문제가 발생했어요.";
      input.setSessions((prev) =>
        fillPendingAssistantError(prev, input.sessionId, `오류: ${errText}`)
      );
    }
  } finally {
    input.setLoading(false);
  }
}
