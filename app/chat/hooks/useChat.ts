"use client";

import { useMemo } from "react";
import { buildInChatAssessmentPrompt } from "./useChat.assessment";
import { closeChatDrawer, openChatDrawer } from "./useChat.ui";
import { useAllResultsBootstrap, useSessionAndProfileBootstrap } from "./useChat.bootstrap";
import { useChatDerivedState } from "./useChat.derived";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import { createChatCommandLayer } from "./useChat.commandLayer";
import {
  useActiveSessionScrollEffect,
  useAutoInitAssistantEffect,
  useStickToBottomTrackingEffect,
} from "./useChat.scrollEffects";
import { useChatFollowupActions } from "./useChat.followupActions";
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
  const chatState = useChatState();
  const {
    sessions, setSessions, activeId, setActiveId, profile, setProfile, input, setInput,
    loading, showSettings, setShowSettings, showProfileBanner, setShowProfileBanner,
    profileLoaded, setProfileLoaded, drawerVisible, setDrawerVisible, drawerOpen, setDrawerOpen,
    localCheckAi, setLocalCheckAi, localAssessCats, setLocalAssessCats, assessResult, setAssessResult,
    checkAiResult, setCheckAiResult, healthLink, setHealthLink, orders, setOrders, resultsLoaded, setResultsLoaded,
    titleHighlightId, suggestions, setSuggestions, interactiveActions, setInteractiveActions,
    inChatAssessment, actionLoading, titleLoading, titleError, topTitleHighlight,
    actionMemory, setActionMemory,
  } = chatState;

  const chatRefs = useChatRefs();
  const {
    activeIdRef,
    messagesContainerRef,
    messagesEndRef,
    stickToBottomRef,
    initStartedRef,
    readyToPersistRef,
    actorAppUserIdRef,
    actorLoggedInRef,
    actorPhoneLinkedRef,
    suggestionHistoryRef,
  } = chatRefs;

  function openDrawer() {
    openChatDrawer(setDrawerVisible, setDrawerOpen);
  }

  function closeDrawer() {
    closeChatDrawer(setDrawerVisible, setDrawerOpen);
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
    setHealthLink,
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
    healthLink,
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

  const {
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
  } = createChatCommandLayer({
    active,
    state: chatState,
    refs: chatRefs,
    runtimeContextText,
    buildActionContextText,
    buildContextPayload,
    buildRuntimeContextPayload,
    fetchSuggestions,
    fetchInteractiveActions,
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
    healthLink,
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
