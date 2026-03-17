"use client";

import type { ChatActionType } from "@/lib/chat/agent-actions";
import type { ChatSession } from "@/types/chat";
import { getTzOffsetMinutes } from "../utils";
import { requestActionExecutionDecision } from "./useChat.api";
import { createInChatAssessmentHandlers } from "./useChat.assessmentHandlers";
import { createAssistantTurnHandlers } from "./useChat.assistantTurnHandlers";
import { isBrowserOnline } from "./useChat.browser";
import {
  clearFollowups,
  rememberExecutedActions,
  updateAssistantMessage,
} from "./useChat.commandLayer.helpers";
import { CHAT_COPY, toAssistantErrorText } from "./useChat.copy";
import { createInteractiveCommands } from "./useChat.interactiveCommands";
import { createMessageFlowHandlers } from "./useChat.messageFlowHandlers";
import type { UseChatRefs } from "./useChat.refs";
import { createSessionCommands } from "./useChat.sessionCommands";
import type { UseChatState } from "./useChat.state";

type CreateChatCommandLayerInput = {
  active: ChatSession | null;
  state: UseChatState;
  refs: UseChatRefs;
  runtimeContextText: string;
  buildActionContextText: (sessionId: string) => string;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: () => Record<string, unknown> | null;
  fetchSuggestions: (
    lastAssistantText: string,
    sessionIdOverride?: string
  ) => Promise<void>;
  fetchInteractiveActions: (
    lastAssistantText: string,
    sessionIdOverride?: string
  ) => Promise<void>;
};

export function createChatCommandLayer({
  active,
  state,
  refs,
  runtimeContextText,
  buildActionContextText,
  buildContextPayload,
  buildRuntimeContextPayload,
  fetchSuggestions,
  fetchInteractiveActions,
}: CreateChatCommandLayerInput) {
  const rememberActions = (actions: ChatActionType[]) =>
    rememberExecutedActions(actions, state.setActionMemory);
  const resetFollowups = () =>
    clearFollowups(state.setSuggestions, state.setInteractiveActions);
  const patchAssistantMessage = (
    sessionId: string,
    messageId: string,
    content: string
  ) => updateAssistantMessage(state.setSessions, sessionId, messageId, content);

  const { finalizeAssistantTurn, generateTitle } = createAssistantTurnHandlers({
    activeId: state.activeId,
    sessions: state.sessions,
    setSessions: state.setSessions,
    fetchSuggestions,
    fetchInteractiveActions,
    savedKeysRef: refs.savedKeysRef,
    firstUserMessageRef: refs.firstUserMessageRef,
    firstAssistantMessageRef: refs.firstAssistantMessageRef,
    firstAssistantReplyRef: refs.firstAssistantReplyRef,
    setTitleLoading: state.setTitleLoading,
    setTitleError: state.setTitleError,
    setTitleHighlightId: state.setTitleHighlightId,
    setTopTitleHighlight: state.setTopTitleHighlight,
  });

  const { initializeInChatAssessment, tryHandleInChatAssessmentInput } =
    createInChatAssessmentHandlers({
      state: state.inChatAssessment,
      setInChatAssessment: state.setInChatAssessment,
      clearFollowups: resetFollowups,
      updateAssistantMessage: patchAssistantMessage,
      finalizeAssistantTurn,
      setLocalCheckAi: state.setLocalCheckAi,
      setCheckAiResult: state.setCheckAiResult,
      setLocalAssessCats: state.setLocalAssessCats,
      setAssessResult: state.setAssessResult,
      getTzOffsetMinutes,
    });

  const interactiveCommands = createInteractiveCommands({
    active,
    loading: state.loading,
    actionLoading: state.actionLoading,
    runtimeContextText,
    buildActionContextText,
    requestActionExecutionDecision,
    activeIdRef: refs.activeIdRef,
    lastInteractiveActionRef: refs.lastInteractiveActionRef,
    setActionLoading: state.setActionLoading,
    setShowSettings: state.setShowSettings,
    setInChatAssessment: state.setInChatAssessment,
    setSessions: state.setSessions,
    rememberExecutedActions: rememberActions,
    initializeInChatAssessment,
    finalizeAssistantTurn,
    updateAssistantMessage: patchAssistantMessage,
  });

  const {
    tryHandleCartCommand,
    tryHandleAgentActionDecision,
    handleInteractiveAction,
  } = interactiveCommands;

  const { sendMessage, startInitialAssistantMessage } = createMessageFlowHandlers({
    loading: state.loading,
    active,
    input: state.input,
    setInput: state.setInput,
    clearFollowups: resetFollowups,
    firstUserMessageRef: refs.firstUserMessageRef,
    setSessions: state.setSessions,
    stickToBottomRef: refs.stickToBottomRef,
    messagesContainerRef: refs.messagesContainerRef,
    tryHandleInChatAssessmentInput,
    isBrowserOnline,
    tryHandleAgentActionDecision,
    tryHandleCartCommand,
    updateAssistantMessage: patchAssistantMessage,
    setLoading: state.setLoading,
    buildContextPayload,
    buildRuntimeContextPayload,
    abortRef: refs.abortRef,
    finalizeAssistantTurn,
    toAssistantErrorText,
    sessions: state.sessions,
    resultsLoaded: state.resultsLoaded,
    initStartedRef: refs.initStartedRef,
    fetchSuggestions,
    fetchInteractiveActions,
    firstAssistantMessageRef: refs.firstAssistantMessageRef,
    savedKeysRef: refs.savedKeysRef,
    readyToPersistRef: refs.readyToPersistRef,
    offlineChatMessage: CHAT_COPY.offlineChat,
    offlineInitMessage: CHAT_COPY.offlineInit,
  });

  const {
    newChat,
    deleteChat,
    renameChat,
    stopStreaming,
    handleProfileChange,
    cancelInChatAssessment,
    openAssessmentPageFromChat,
  } = createSessionCommands({
    sessions: state.sessions,
    activeId: state.activeId,
    inChatAssessment: state.inChatAssessment,
    actorLoggedIn: refs.actorLoggedInRef.current,
    actorAppUserId: refs.actorAppUserIdRef.current,
    abortRef: refs.abortRef,
    firstUserMessageRef: refs.firstUserMessageRef,
    firstAssistantMessageRef: refs.firstAssistantMessageRef,
    firstAssistantReplyRef: refs.firstAssistantReplyRef,
    readyToPersistRef: refs.readyToPersistRef,
    suggestionHistoryRef: refs.suggestionHistoryRef,
    setSessions: state.setSessions,
    setActiveId: state.setActiveId,
    setProfile: state.setProfile,
    setInChatAssessment: state.setInChatAssessment,
    setTitleLoading: state.setTitleLoading,
    setTitleError: state.setTitleError,
    clearFollowups: resetFollowups,
  });

  return {
    sendMessage,
    startInitialAssistantMessage,
    handleInteractiveAction,
    newChat,
    deleteChat,
    renameChat,
    stopStreaming,
    handleProfileChange,
    cancelInChatAssessment,
    openAssessmentPageFromChat,
    generateTitle,
  };
}
