"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";
import {
  getClientIdLocal,
  getTzOffsetMinutes,
  saveSessions,
} from "../utils";
import {
  readLocalAssessCats,
  readLocalCheckAiTopLabels,
} from "./useChat.results";
import { DEFAULT_CHAT_TITLE } from "./useChat.session";
import {
  readActionMemory,
  rememberActionMemoryList,
  type ActionMemoryMap,
} from "./useChat.actionMemory";
import { isBrowserOnline } from "./useChat.browser";
import {
  type ChatActionType,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import {
  buildInChatAssessmentPrompt,
  type InChatAssessmentMode,
  type InChatAssessmentState,
} from "./useChat.assessment";
import {
  requestActionExecutionDecision,
  requestActionSuggestions,
  requestChatSuggestions,
  requestChatTitle,
} from "./useChat.api";
import { filterPersistableSessions, saveChatOnce } from "./useChat.persistence";
import {
  appendMessagesToSession,
  replaceSessionMessageContent,
  updateSessionTitle,
} from "./useChat.sessionState";
import { prepareOutgoingTurn } from "./useChat.sendMessage";
import { resolveSendMessageBranch } from "./useChat.sendMessageFlow";
import { runStreamedAssistantTurn } from "./useChat.streamTurn";
import { startInitialAssistantMessageFlow } from "./useChat.initialAssistant";
import {
  finalizeAssistantTurnFlow,
  generateTitleFlow,
  type FinalizeAssistantTurnInput,
} from "./useChat.finalizeFlow";
import {
  handleInChatAssessmentInputFlow,
  initializeInChatAssessmentFlow,
} from "./useChat.assessmentFlow";
import {
  fetchInteractiveActionsForSession,
  fetchSuggestionsForSession,
} from "./useChat.followups";
import { CHAT_COPY, toAssistantErrorText } from "./useChat.copy";
import {
  closeChatDrawer,
  isContainerAtBottom,
  openChatDrawer,
  scrollContainerToBottom,
  scrollContainerToTop,
} from "./useChat.ui";
import { type LastInteractiveAction } from "./useChat.interactionGuard";
import {
  useAllResultsBootstrap,
  useSessionAndProfileBootstrap,
} from "./useChat.bootstrap";
import { useChatDerivedState } from "./useChat.derived";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import { createInteractiveCommands } from "./useChat.interactiveCommands";
import { createSessionCommands } from "./useChat.sessionCommands";

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localCheckAi, setLocalCheckAi] = useState<string[]>([]);
  const [localAssessCats, setLocalAssessCats] = useState<string[]>([]);
  const [assessResult, setAssessResult] = useState<any | null>(null);
  const [checkAiResult, setCheckAiResult] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [titleHighlightId, setTitleHighlightId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [interactiveActions, setInteractiveActions] = useState<
    ChatAgentSuggestedAction[]
  >([]);
  const [inChatAssessment, setInChatAssessment] =
    useState<InChatAssessmentState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [topTitleHighlight, setTopTitleHighlight] = useState(false);
  const [actionMemory, setActionMemory] = useState<ActionMemoryMap>(() =>
    readActionMemory()
  );

  useEffect(() => {
    setActionMemory(readActionMemory());
  }, []);

  const firstUserMessageRef = useRef<string>("");
  const firstAssistantMessageRef = useRef<string>("");
  const firstAssistantReplyRef = useRef<string>("");
  const activeIdRef = useRef<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const initStartedRef = useRef<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const savedKeysRef = useRef<Set<string>>(new Set());
  const readyToPersistRef = useRef<Record<string, boolean>>({});
  const actorAppUserIdRef = useRef<string | null>(null);
  const actorLoggedInRef = useRef(false);
  const actorPhoneLinkedRef = useRef(false);
  const suggestionHistoryRef = useRef<Record<string, string[]>>({});
  const lastInteractiveActionRef = useRef<LastInteractiveAction>(null);

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

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    clearFollowups();
  }, [activeId]);

  useEffect(() => {
    if (!sessions.length) return;

    saveSessions(filterPersistableSessions(sessions, readyToPersistRef.current));
  }, [sessions]);

  const { hideFooter, showFooter } = useFooter();
  useEffect(() => {
    if (!manageFooter) return;
    hideFooter();
    return () => showFooter();
  }, [hideFooter, manageFooter, showFooter]);

  useEffect(() => {
    const labels = readLocalCheckAiTopLabels();
    if (labels.length) setLocalCheckAi(labels);
  }, []);

  useEffect(() => {
    const cats = readLocalAssessCats();
    if (cats.length) setLocalAssessCats(cats);
  }, []);

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

  const prevActiveIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const msgLength = active.messages.length;
    if (prevActiveIdRef.current !== activeId) {
      requestAnimationFrame(() => {
        scrollContainerToTop(messagesContainerRef);
      });
      prevActiveIdRef.current = activeId;
      prevMsgCountRef.current = msgLength;
      return;
    }

    if (msgLength > prevMsgCountRef.current) {
      requestAnimationFrame(() => {
        if (stickToBottomRef.current) {
          scrollContainerToBottom(messagesContainerRef);
        }
      });
      prevMsgCountRef.current = msgLength;
    }
  }, [activeId, active?.messages.length]);

  useEffect(() => {
    if (!enableAutoInit) return;
    if (!resultsLoaded || !profileLoaded) return;
    if (!activeId) return;

    const session = sessions.find((item) => item.id === activeId);
    if (!session || session.messages.length > 0) return;

    startInitialAssistantMessage(activeId);
  }, [enableAutoInit, resultsLoaded, profileLoaded, activeId, sessions]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      stickToBottomRef.current = isContainerAtBottom(messagesContainerRef);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [messagesContainerRef.current]);

  function updateAssistantMessage(sessionId: string, messageId: string, content: string) {
    setSessions((prev) =>
      replaceSessionMessageContent(prev, sessionId, messageId, content)
    );
  }

  async function finalizeAssistantTurn(input: FinalizeAssistantTurnInput) {
    await finalizeAssistantTurnFlow({
      turn: input,
      onFirstTurn: async (content) => {
        firstAssistantReplyRef.current = content;
        await generateTitle();
      },
      fetchSuggestions,
      fetchInteractiveActions,
      persistTurn: async (turn) => {
        const clientId = getClientIdLocal();
        const tzOffsetMinutes = getTzOffsetMinutes();
        const persistedMessages = turn.userMessage
          ? [turn.userMessage, { ...turn.assistantMessage, content: turn.content }]
          : [{ ...turn.assistantMessage, content: turn.content }];

        await saveChatOnce({
          savedKeys: savedKeysRef.current,
          clientId,
          sessionId: turn.sessionId,
          title:
            sessions.find((session) => session.id === turn.sessionId)?.title ||
            DEFAULT_CHAT_TITLE,
          messages: persistedMessages,
          tzOffsetMinutes,
        });
      },
    });
  }

  async function generateTitle() {
    await generateTitleFlow({
      activeId,
      firstUserMessage: firstUserMessageRef.current,
      firstAssistantMessage: firstAssistantMessageRef.current,
      firstAssistantReply: firstAssistantReplyRef.current,
      setTitleLoading,
      setTitleError,
      requestTitle: requestChatTitle,
      applyTitle: (sessionId, title) => {
        setSessions((prev) => updateSessionTitle(prev, sessionId, title));
      },
      setTitleHighlightId,
      setTopTitleHighlight,
    });
  }

  async function fetchSuggestions(
    lastAssistantText: string,
    sessionIdOverride?: string
  ) {
    const targetSessionId = sessionIdOverride ?? active?.id ?? null;
    if (!targetSessionId) {
      setSuggestions([]);
      return;
    }
    const finalSuggestions = await fetchSuggestionsForSession({
      sessionId: targetSessionId,
      sessions,
      lastAssistantText,
      runtimeContextText,
      suggestionHistoryStore: suggestionHistoryRef.current,
      buildSummaryForSession: (sessionId) => buildSummaryForSession(sessionId),
      buildContextPayload: (sessionId) => buildContextPayload(sessionId),
      requestChatSuggestions,
    });
    setSuggestions(finalSuggestions);
  }

  async function fetchInteractiveActions(
    lastAssistantText: string,
    sessionIdOverride?: string
  ) {
    const targetSessionId = sessionIdOverride ?? active?.id ?? null;
    if (!targetSessionId) {
      setInteractiveActions([]);
      return;
    }
    const resolvedActions = await fetchInteractiveActionsForSession({
      sessionId: targetSessionId,
      sessions,
      lastAssistantText,
      runtimeContextText,
      actionMemory,
      inChatAssessmentSessionId: inChatAssessment?.sessionId ?? null,
      buildActionContextText: (sessionId) => buildActionContextText(sessionId),
      requestActionSuggestions,
    });

    if ((activeIdRef.current || "") !== targetSessionId) return;
    setInteractiveActions(resolvedActions);
  }

  function initializeInChatAssessment(
    sessionId: string,
    mode: InChatAssessmentMode
  ): string {
    return initializeInChatAssessmentFlow({
      sessionId,
      mode,
      setInChatAssessment,
      clearSuggestionsAndActions: clearFollowups,
    });
  }

  async function tryHandleInChatAssessmentInput(params: {
    text: string;
    sessionId: string;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    isFirst: boolean;
  }) {
    return handleInChatAssessmentInputFlow({
      state: inChatAssessment,
      text: params.text,
      sessionId: params.sessionId,
      userMessage: params.userMessage,
      assistantMessage: params.assistantMessage,
      isFirst: params.isFirst,
      setInChatAssessment,
      clearSuggestionsAndActions: clearFollowups,
      updateAssistantMessage,
      finalizeAssistantTurn,
      setLocalCheckAi,
      setCheckAiResult,
      setLocalAssessCats,
      setAssessResult,
      getTzOffsetMinutes,
    });
  }

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

  async function sendMessage(overrideText?: string) {
    const preparedTurn = prepareOutgoingTurn({
      loading,
      active,
      input,
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

    setInput("");
    clearFollowups();
    if (isFirst) firstUserMessageRef.current = text;

    setSessions((prev) =>
      appendMessagesToSession(prev, sessionId, [userMessage, assistantMessage], now)
    );

    stickToBottomRef.current = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollContainerToBottom(messagesContainerRef))
    );

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
        tryHandleInChatAssessmentInput,
        isBrowserOnline,
        handleOffline: ({ sessionId: targetSessionId, assistantMessage: targetAssistantMessage }) => {
          updateAssistantMessage(
            targetSessionId,
            targetAssistantMessage.id,
            CHAT_COPY.offlineChat
          );
        },
        tryHandleAgentActionDecision,
        tryHandleCartCommand,
      }
    );
    if (branchResult !== "stream") return;

    setLoading(true);

    try {
      await runStreamedAssistantTurn({
        mode: "chat",
        sessionId,
        messages: sessionMessages.concat(userMessage),
        assistantMessage,
        buildContextPayload,
        buildRuntimeContextPayload,
        updateAssistantMessage,
        setAbortController: (controller) => {
          abortRef.current = controller;
        },
        onComplete: async (fullText) => {
          await finalizeAssistantTurn({
            sessionId,
            content: fullText,
            assistantMessage,
            userMessage,
            isFirst,
          });
        },
      });
    } catch (error) {
      if ((error as any)?.name !== "AbortError") {
        updateAssistantMessage(
          sessionId,
          assistantMessage.id,
          toAssistantErrorText(error)
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function startInitialAssistantMessage(sessionId: string) {
    await startInitialAssistantMessageFlow({
      sessionId,
      sessions,
      resultsLoaded,
      initStartedMap: initStartedRef.current,
      isOnline: isBrowserOnline,
      offlineMessage: CHAT_COPY.offlineInit,
      setSessions,
      setLoading,
      setAbortController: (controller) => {
        abortRef.current = controller;
      },
      buildContextPayload,
      buildRuntimeContextPayload,
      updateAssistantMessage,
      onComplete: async ({ fullText, assistantMessage }) => {
        fetchSuggestions(fullText, sessionId).catch(() => {});
        fetchInteractiveActions(fullText, sessionId).catch(() => {});
        firstAssistantMessageRef.current = fullText;

        try {
          const tzOffsetMinutes = getTzOffsetMinutes();
          const clientId2 = getClientIdLocal();
          await saveChatOnce({
            savedKeys: savedKeysRef.current,
            clientId: clientId2,
            sessionId,
            messages: [{ ...assistantMessage, content: fullText }],
            tzOffsetMinutes,
          });
          readyToPersistRef.current[sessionId] = true;
          setSessions((prev) => prev.slice());
        } catch {}
      },
    });
  }

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
