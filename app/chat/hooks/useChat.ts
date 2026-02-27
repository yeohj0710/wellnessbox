"use client";

import { useMemo } from "react";
import { getTzOffsetMinutes } from "../utils";
import { rememberActionMemoryList } from "./useChat.actionMemory";
import { isBrowserOnline } from "./useChat.browser";
import type { ChatActionType } from "@/lib/chat/agent-actions";
import { buildInChatAssessmentPrompt } from "./useChat.assessment";
import { requestActionExecutionDecision } from "./useChat.api";
import { replaceSessionMessageContent } from "./useChat.sessionState";
import { CHAT_COPY, toAssistantErrorText } from "./useChat.copy";
import { closeChatDrawer, openChatDrawer } from "./useChat.ui";
import { useAllResultsBootstrap, useSessionAndProfileBootstrap } from "./useChat.bootstrap";
import { useChatDerivedState } from "./useChat.derived";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import { createInteractiveCommands } from "./useChat.interactiveCommands";
import { createSessionCommands } from "./useChat.sessionCommands";
import {
  useActiveSessionScrollEffect,
  useAutoInitAssistantEffect,
  useStickToBottomTrackingEffect,
} from "./useChat.scrollEffects";
import { useChatFollowupActions } from "./useChat.followupActions";
import { createInChatAssessmentHandlers } from "./useChat.assessmentHandlers";
import { createAssistantTurnHandlers } from "./useChat.assistantTurnHandlers";
import { createMessageFlowHandlers } from "./useChat.messageFlowHandlers";
import { useChatLocalEffects } from "./useChat.localEffects";
import { useChatState } from "./useChat.state";
import { useChatRefs } from "./useChat.refs";

type UseChatOptions = {
  manageFooter?: boolean;
  remoteBootstrap?: boolean;
  enableAutoInit?: boolean;
  pageContext?: ChatPageAgentContext | null;
};

export default function useChat(options: UseChatOptions = {}) {
  const manageFooter = options.manageFooter ?? true;
  const remoteBootstrap = options.remoteBootstrap ?? true;
  const enableAutoInit = options.enableAutoInit ?? true;
  const pageContext = options.pageContext ?? null;
  const {
    sessions, setSessions, activeId, setActiveId, profile, setProfile, input, setInput,
    loading, setLoading, showSettings, setShowSettings, showProfileBanner, setShowProfileBanner,
    profileLoaded, setProfileLoaded, drawerVisible, setDrawerVisible, drawerOpen, setDrawerOpen,
    localCheckAi, setLocalCheckAi, localAssessCats, setLocalAssessCats, assessResult, setAssessResult,
    checkAiResult, setCheckAiResult, orders, setOrders, resultsLoaded, setResultsLoaded,
    titleHighlightId, setTitleHighlightId, suggestions, setSuggestions, interactiveActions,
    setInteractiveActions, inChatAssessment, setInChatAssessment, actionLoading, setActionLoading,
    titleLoading, setTitleLoading, titleError, setTitleError, topTitleHighlight,
    setTopTitleHighlight, actionMemory, setActionMemory,
  } = useChatState();

  const {
    firstUserMessageRef, firstAssistantMessageRef, firstAssistantReplyRef, activeIdRef,
    messagesContainerRef, messagesEndRef, stickToBottomRef, initStartedRef, abortRef,
    savedKeysRef, readyToPersistRef, actorAppUserIdRef, actorLoggedInRef, actorPhoneLinkedRef,
    suggestionHistoryRef, lastInteractiveActionRef,
  } = useChatRefs();

  function openDrawer() {
    openChatDrawer(setDrawerVisible, setDrawerOpen);
  }

  function closeDrawer() {
    closeChatDrawer(setDrawerVisible, setDrawerOpen);
  }

  function rememberExecutedActions(actions: ChatActionType[]) {
    if (!Array.isArray(actions) || actions.length === 0) return;
    setActionMemory((prev) => rememberActionMemoryList(actions, prev));
  }

  function clearFollowups() {
    setSuggestions([]);
    setInteractiveActions([]);
  }

  useSessionAndProfileBootstrap({
    remoteBootstrap,
    activeIdRef,
    readyToPersistRef,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setSessions,
    setActiveId,
    setProfile,
    setShowProfileBanner,
    setProfileLoaded,
  });

  useChatLocalEffects({
    manageFooter,
    activeId,
    sessions,
    readyToPersistRef,
    activeIdRef,
    setActionMemory,
    setSuggestions,
    setInteractiveActions,
    setLocalCheckAi,
    setLocalAssessCats,
  });

  useAllResultsBootstrap({
    remoteBootstrap,
    actorLoggedInRef,
    actorAppUserIdRef,
    actorPhoneLinkedRef,
    setAssessResult,
    setCheckAiResult,
    setOrders,
    setResultsLoaded,
  });

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) || null,
    [sessions, activeId]
  );

  const {
    runtimeContextText,
    userContextSummary,
    showAgentGuide,
    showAgentCapabilityHub,
    agentCapabilityActions,
    agentGuideExamples,
    buildSummaryForSession,
    buildActionContextText,
    buildContextPayload,
    buildRuntimeContextPayload,
  } = useChatDerivedState({
    active,
    activeId,
    profile,
    orders,
    assessResult,
    checkAiResult,
    sessions,
    localAssessCats,
    localCheckAi,
    pageContext,
    inChatAssessment,
    interactiveActionsLength: interactiveActions.length,
    actionMemory,
    actorLoggedIn: actorLoggedInRef.current,
    actorPhoneLinked: actorPhoneLinkedRef.current,
  });

  const { fetchSuggestions, fetchInteractiveActions } = useChatFollowupActions({
    active,
    sessions,
    runtimeContextText,
    suggestionHistoryRef,
    buildSummaryForSession,
    buildContextPayload,
    setSuggestions,
    actionMemory,
    inChatAssessmentSessionId: inChatAssessment?.sessionId ?? null,
    buildActionContextText,
    activeIdRef,
    setInteractiveActions,
  });

  function updateAssistantMessage(sessionId: string, messageId: string, content: string) {
    setSessions((prev) =>
      replaceSessionMessageContent(prev, sessionId, messageId, content)
    );
  }

  const { finalizeAssistantTurn, generateTitle } = createAssistantTurnHandlers({
    activeId,
    sessions,
    setSessions,
    fetchSuggestions,
    fetchInteractiveActions,
    savedKeysRef,
    firstUserMessageRef,
    firstAssistantMessageRef,
    firstAssistantReplyRef,
    setTitleLoading,
    setTitleError,
    setTitleHighlightId,
    setTopTitleHighlight,
  });

  const { initializeInChatAssessment, tryHandleInChatAssessmentInput } =
    createInChatAssessmentHandlers({
      state: inChatAssessment,
      setInChatAssessment,
      clearFollowups,
      updateAssistantMessage,
      finalizeAssistantTurn,
      setLocalCheckAi,
      setCheckAiResult,
      setLocalAssessCats,
      setAssessResult,
      getTzOffsetMinutes,
    });

  const interactiveCommands = createInteractiveCommands({
    active,
    loading,
    actionLoading,
    runtimeContextText,
    buildActionContextText,
    requestActionExecutionDecision,
    activeIdRef,
    lastInteractiveActionRef,
    setActionLoading,
    setShowSettings,
    setInChatAssessment,
    setSessions,
    rememberExecutedActions,
    initializeInChatAssessment,
    finalizeAssistantTurn,
    updateAssistantMessage,
  });
  const {
    tryHandleCartCommand,
    tryHandleAgentActionDecision,
    handleInteractiveAction,
  } = interactiveCommands;

  const { sendMessage, startInitialAssistantMessage } = createMessageFlowHandlers({
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
    offlineChatMessage: CHAT_COPY.offlineChat,
    offlineInitMessage: CHAT_COPY.offlineInit,
  });

  useActiveSessionScrollEffect({
    active,
    activeId,
    messagesContainerRef,
    stickToBottomRef,
  });

  useAutoInitAssistantEffect({
    enableAutoInit,
    resultsLoaded,
    profileLoaded,
    activeId,
    sessions,
    startInitialAssistantMessage,
  });

  useStickToBottomTrackingEffect({
    messagesContainerRef,
    stickToBottomRef,
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
    sessions,
    activeId,
    inChatAssessment,
    actorLoggedIn: actorLoggedInRef.current,
    actorAppUserId: actorAppUserIdRef.current,
    abortRef,
    firstUserMessageRef,
    firstAssistantMessageRef,
    firstAssistantReplyRef,
    readyToPersistRef,
    suggestionHistoryRef,
    setSessions,
    setActiveId,
    setProfile,
    setInChatAssessment,
    setTitleLoading,
    setTitleError,
    clearFollowups,
  });

  const inChatAssessmentPrompt = useMemo(
    () =>
      buildInChatAssessmentPrompt({
        state: inChatAssessment,
        activeSessionId: activeId,
      }),
    [inChatAssessment, activeId]
  );

  const bootstrapPending =
    !profileLoaded ||
    !resultsLoaded ||
    !active ||
    (enableAutoInit &&
      !!activeId &&
      !!active &&
      active.messages.length === 0 &&
      initStartedRef.current[active.id] !== true);

  return {
    sessions,
    activeId,
    setActiveId,
    profile,
    setProfile,
    input,
    setInput,
    loading,
    showSettings,
    setShowSettings,
    showProfileBanner,
    setShowProfileBanner,
    profileLoaded,
    drawerVisible,
    drawerOpen,
    openDrawer,
    closeDrawer,
    assessResult,
    checkAiResult,
    orders,
    userContextSummary,
    titleHighlightId,
    suggestions,
    interactiveActions,
    showAgentGuide,
    agentGuideExamples,
    showAgentCapabilityHub,
    agentCapabilityActions,
    actionLoading,
    bootstrapPending,
    titleLoading,
    titleError,
    topTitleHighlight,
    inChatAssessmentPrompt,
    messagesContainerRef,
    messagesEndRef,
    newChat,
    deleteChat,
    renameChat,
    stopStreaming,
    sendMessage,
    handleInteractiveAction,
    cancelInChatAssessment,
    openAssessmentPageFromChat,
    generateTitle,
    active,
    handleProfileChange,
  };
}
