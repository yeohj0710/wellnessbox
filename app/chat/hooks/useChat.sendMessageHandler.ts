import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";
import type { ChatMessageStatus, ChatSession } from "@/types/chat";
import { appendMessagesToSession } from "./useChat.sessionState";
import { prepareOutgoingTurn } from "./useChat.sendMessage";
import {
  resolveSendMessageBranch,
  type SendMessageBranchInput,
} from "./useChat.sendMessageFlow";
import { runStreamedAssistantTurn } from "./useChat.streamTurn";
import { toModelTranscript } from "./useChat.transcript";
import type { FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";

type SendMessageFlowDeps = {
  loading: boolean;
  active: ChatSession | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  clearFollowups: () => void;
  firstUserMessageRef: MutableRefObject<string>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  stickToBottomRef: MutableRefObject<boolean>;
  tryHandleInChatAssessmentInput: (
    input: SendMessageBranchInput
  ) => Promise<boolean>;
  isBrowserOnline: () => boolean;
  tryHandleAgentActionDecision: (
    input: SendMessageBranchInput
  ) => Promise<boolean>;
  tryHandleCartCommand: (input: SendMessageBranchInput) => Promise<boolean>;
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    status?: ChatMessageStatus | null
  ) => void;
  offlineChatMessage: string;
  setLoading: Dispatch<SetStateAction<boolean>>;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: Parameters<
    typeof runStreamedAssistantTurn
  >[0]["buildRuntimeContextPayload"];
  setAbortController: (controller: AbortController | null) => void;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  toAssistantErrorText: (error: unknown) => string;
};

export async function runSendMessageFlow(
  overrideText: string | undefined,
  deps: SendMessageFlowDeps
) {
  const preparedTurn = prepareOutgoingTurn({
    loading: deps.loading,
    active: deps.active,
    input: deps.input,
    overrideText,
  });
  if (!preparedTurn) return;

  const {
    text,
    isFirst,
    now,
    sessionId,
    sessionMessages,
    userMessage,
    assistantMessage,
  } = preparedTurn;

  deps.setInput("");
  deps.clearFollowups();
  if (isFirst) deps.firstUserMessageRef.current = text;

  deps.setSessions((prev) =>
    appendMessagesToSession(prev, sessionId, [userMessage, assistantMessage], now)
  );

  // Sending re-pins the feed; the scroll itself is owned by useChatScrollAnchor,
  // which reacts to the new message and re-pins again after late layout.
  deps.stickToBottomRef.current = true;

  const branchResult = await resolveSendMessageBranch(
    {
      text,
      sessionId,
      sessionMessages,
      userMessage,
      assistantMessage,
      isFirst,
    },
    {
      tryHandleInChatAssessmentInput: deps.tryHandleInChatAssessmentInput,
      isBrowserOnline: deps.isBrowserOnline,
      handleOffline: ({
        sessionId: targetSessionId,
        assistantMessage: targetAssistantMessage,
      }) => {
        deps.updateAssistantMessage(
          targetSessionId,
          targetAssistantMessage.id,
          deps.offlineChatMessage,
          "error"
        );
      },
      tryHandleAgentActionDecision: deps.tryHandleAgentActionDecision,
      tryHandleCartCommand: deps.tryHandleCartCommand,
    }
  );
  if (branchResult !== "stream") return;

  deps.setLoading(true);
  try {
    await runStreamedAssistantTurn({
      mode: "chat",
      sessionId,
      messages: toModelTranscript(sessionMessages).concat(userMessage),
      assistantMessage,
      buildContextPayload: deps.buildContextPayload,
      buildRuntimeContextPayload: deps.buildRuntimeContextPayload,
      updateAssistantMessage: deps.updateAssistantMessage,
      setAbortController: deps.setAbortController,
      onComplete: async (fullText, outcome) => {
        await deps.finalizeAssistantTurn({
          sessionId,
          content: fullText,
          assistantMessage,
          userMessage,
          isFirst,
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
}
