import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";
import type { ChatSession } from "@/types/chat";
import type { SendMessageBranchInput } from "./useChat.sendMessageFlow";
import { runInitialAssistantMessageHandler } from "./useChat.initialMessageHandler";
import { type FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";
import { runSendMessageFlow } from "./useChat.sendMessageHandler";

type CreateMessageFlowHandlersInput = {
  loading: boolean;
  active: ChatSession | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  clearFollowups: () => void;
  firstUserMessageRef: MutableRefObject<string>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  stickToBottomRef: MutableRefObject<boolean>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
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
    content: string
  ) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: Parameters<
    typeof runSendMessageFlow
  >[1]["buildRuntimeContextPayload"];
  abortRef: MutableRefObject<AbortController | null>;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  toAssistantErrorText: (error: unknown) => string;
  sessions: ChatSession[];
  resultsLoaded: boolean;
  initStartedRef: MutableRefObject<Record<string, boolean>>;
  fetchSuggestions: (lastAssistantText: string, sessionIdOverride?: string) => Promise<void>;
  fetchInteractiveActions: (
    lastAssistantText: string,
    sessionIdOverride?: string
  ) => Promise<void>;
  firstAssistantMessageRef: MutableRefObject<string>;
  savedKeysRef: MutableRefObject<Set<string>>;
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
  offlineChatMessage: string;
  offlineInitMessage: string;
};

export function createMessageFlowHandlers({
  loading,
  active,
  input,
  setInput,
  clearFollowups,
  firstUserMessageRef,
  setSessions,
  stickToBottomRef,
  messagesContainerRef,
  tryHandleInChatAssessmentInput,
  isBrowserOnline,
  tryHandleAgentActionDecision,
  tryHandleCartCommand,
  updateAssistantMessage,
  setLoading,
  buildContextPayload,
  buildRuntimeContextPayload,
  abortRef,
  finalizeAssistantTurn,
  toAssistantErrorText,
  sessions,
  resultsLoaded,
  initStartedRef,
  fetchSuggestions,
  fetchInteractiveActions,
  firstAssistantMessageRef,
  savedKeysRef,
  readyToPersistRef,
  offlineChatMessage,
  offlineInitMessage,
}: CreateMessageFlowHandlersInput) {
  const sendMessage = async (overrideText?: string) => {
    await runSendMessageFlow(overrideText, {
      loading,
      active,
      input,
      setInput,
      clearFollowups,
      firstUserMessageRef,
      setSessions,
      stickToBottomRef,
      messagesContainerRef,
      tryHandleInChatAssessmentInput,
      isBrowserOnline,
      tryHandleAgentActionDecision,
      tryHandleCartCommand,
      updateAssistantMessage,
      offlineChatMessage,
      setLoading,
      buildContextPayload,
      buildRuntimeContextPayload,
      setAbortController: (controller) => {
        abortRef.current = controller;
      },
      finalizeAssistantTurn,
      toAssistantErrorText,
    });
  };

  const startInitialAssistantMessage = async (sessionId: string) => {
    await runInitialAssistantMessageHandler({
      sessionId,
      sessions,
      resultsLoaded,
      initStartedMap: initStartedRef.current,
      isOnline: isBrowserOnline,
      offlineMessage: offlineInitMessage,
      setSessions,
      setLoading,
      setAbortController: (controller) => {
        abortRef.current = controller;
      },
      buildContextPayload,
      buildRuntimeContextPayload,
      updateAssistantMessage,
      fetchSuggestions,
      fetchInteractiveActions,
      firstAssistantMessageRef,
      savedKeysRef,
      readyToPersistRef,
    });
  };

  return {
    sendMessage,
    startInitialAssistantMessage,
  };
}
