"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import { buildUserContextSummary } from "@/lib/chat/context";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";
import {
  getClientIdLocal,
  getTzOffsetMinutes,
  loadProfileLocal,
  loadProfileServer,
  loadSessions,
  saveProfileLocal,
  saveProfileServer,
  saveSessions,
  uid,
} from "../utils";
import { buildChatContextPayload, buildUserContextInput } from "./useChat.context";
import {
  normalizeAllResultsPayload,
  readLocalAssessCats,
  readLocalCheckAiTopLabels,
} from "./useChat.results";
import { DEFAULT_CHAT_TITLE, mergeServerSessions } from "./useChat.session";
import {
  readActionMemory,
  rememberActionMemoryList,
  type ActionMemoryMap,
} from "./useChat.actionMemory";
import {
  formatCartCommandSummary,
  hasRoadAddressInLocalStorage,
  parseCartCommandFromMessages,
} from "./useChat.cart-command";
import {
  clearCartFromChat,
  isBrowserOnline,
  navigateTo,
  openCartFromChat,
  openExternalLink,
} from "./useChat.browser";
import { dispatchChatCartActionRequest } from "@/lib/chat/cart-action-events";
import {
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import {
  isLikelyActionIntentText,
  pickLatestAssistantText,
} from "./useChat.agentActions";
import {
  buildInChatAssessmentPrompt,
  type InChatAssessmentMode,
  type InChatAssessmentState,
} from "./useChat.assessment";
import {
  buildAgentCapabilityActions,
  buildAgentGuideExamples,
  type AgentCapabilityItem,
  type AgentGuideExample,
} from "./useChat.agentGuide";
import { runSingleInteractiveAction as runSingleInteractiveActionFlow } from "./useChat.interactiveActions";
import { runAgentDecision as runAgentDecisionFlow } from "./useChat.agentDecision";
import {
  requestActionExecutionDecision,
  requestDeleteChatSession,
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
import { createNewChatSession, deleteChatSessionState } from "./useChat.sessionActions";
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
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";

type UseChatOptions = {
  manageFooter?: boolean;
  remoteBootstrap?: boolean;
  enableAutoInit?: boolean;
  pageContext?: ChatPageAgentContext | null;
};

const OFFLINE_INIT_MESSAGE =
  "지금 네트워크 연결이 불안정해서 초기 상담 내용을 불러오지 못했어요. 연결이 복구되면 새로고침 없이 다시 이어서 도와드릴게요.";
const OFFLINE_CHAT_MESSAGE =
  "지금 네트워크 연결이 불안정해서 답변을 불러오지 못했어요. 연결이 안정되면 같은 질문을 다시 보내 주세요.";

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
  const lastInteractiveActionRef = useRef<{
    type: ChatActionType;
    at: number;
  } | null>(null);

  function openDrawer() {
    setDrawerVisible(true);
    setTimeout(() => setDrawerOpen(true), 0);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 200);
  }

  function rememberExecutedActions(actions: ChatActionType[]) {
    if (!Array.isArray(actions) || actions.length === 0) return;
    setActionMemory((prev) => rememberActionMemoryList(actions, prev));
  }

  useEffect(() => {
    const existing = loadSessions();
    if (existing.length > 0) {
      const sorted = [...existing].sort(
        (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
      );
      setSessions(sorted);
      setActiveId(sorted[0].id);
      sorted.forEach((session) => {
        readyToPersistRef.current[session.id] = true;
      });
    } else {
      const created = createNewChatSession({
        sessions: [],
        actor: {
          loggedIn: actorLoggedInRef.current,
          appUserId: actorAppUserIdRef.current,
        },
      });
      setSessions(created.nextSessions);
      setActiveId(created.id);
      readyToPersistRef.current[created.id] = false;
    }

    (async () => {
      if (!remoteBootstrap || !isBrowserOnline()) return;
      try {
        const response = await fetch("/api/chat/save", { method: "GET" });
        if (!response.ok) return;

        const json = await response.json().catch(() => ({}));
        if (json?.actor) {
          actorLoggedInRef.current = !!json.actor.loggedIn;
          actorAppUserIdRef.current = json.actor.appUserId ?? null;
          actorPhoneLinkedRef.current = !!json.actor.phoneLinked;
        }

        if (!Array.isArray(json?.sessions)) return;

        setSessions((prev) => {
          const merged = mergeServerSessions({
            prevSessions: prev,
            incomingSessions: json.sessions,
            currentReadyMap: readyToPersistRef.current,
            actor: {
              loggedIn: actorLoggedInRef.current,
              appUserId: actorAppUserIdRef.current,
            },
            currentActiveId: activeIdRef.current,
          });

          readyToPersistRef.current = merged.nextReadyMap;
          setActiveId(merged.nextActiveId);
          return merged.sessions;
        });
      } catch {}
    })();

    (async () => {
      let resolved: UserProfile | undefined = undefined;
      const remote = remoteBootstrap ? await loadProfileServer() : undefined;
      if (remote) {
        resolved = remote;
        saveProfileLocal(remote);
      } else {
        const local = loadProfileLocal();
        if (local) resolved = local;
      }

      setProfile(resolved);
      setShowProfileBanner(!resolved);
      setProfileLoaded(true);
    })();
  }, [remoteBootstrap]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    setSuggestions([]);
    setInteractiveActions([]);
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

  useEffect(() => {
    if (!remoteBootstrap) {
      setResultsLoaded(true);
      return;
    }
    if (!isBrowserOnline()) {
      setResultsLoaded(true);
      return;
    }

    const controller = new AbortController();
    let alive = true;

    fetch(`/api/user/all-results`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) return {};
        return response.json();
      })
      .then((data) => {
        if (!alive) return;
        const normalized = normalizeAllResultsPayload(data);

        if (normalized.actor) {
          actorLoggedInRef.current = normalized.actor.loggedIn;
          actorAppUserIdRef.current = normalized.actor.appUserId;
          actorPhoneLinkedRef.current = normalized.actor.phoneLinked;
        }

        setAssessResult(normalized.assessResult);
        setCheckAiResult(normalized.checkAiResult);
        setOrders(normalized.orders);
      })
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        setResultsLoaded(true);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [remoteBootstrap]);

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) || null,
    [sessions, activeId]
  );

  const latestAssistantTextInActive = useMemo(
    () => pickLatestAssistantText(active?.messages || []),
    [active?.messages]
  );
  const runtimeContextText = useMemo(
    () => (typeof pageContext?.runtimeContextText === "string" ? pageContext.runtimeContextText.trim() : ""),
    [pageContext]
  );
  const pageContextActionSet = useMemo(
    () => new Set<ChatActionType>(pageContext?.preferredActions || []),
    [pageContext]
  );

  const agentCapabilityActions = useMemo<AgentCapabilityItem[]>(() => {
    return buildAgentCapabilityActions({
      latestAssistantText: latestAssistantTextInActive,
      inAssessmentMode: inChatAssessment?.mode ?? null,
      pageContextActionSet,
      actionMemory,
    });
  }, [
    actionMemory,
    inChatAssessment?.mode,
    latestAssistantTextInActive,
    pageContextActionSet,
  ]);

  const agentGuideExamples = useMemo<AgentGuideExample[]>(() => {
    return buildAgentGuideExamples({
      latestAssistantText: latestAssistantTextInActive,
      pageSuggestedPrompts: pageContext?.suggestedPrompts ?? null,
      agentCapabilityActions,
    });
  }, [agentCapabilityActions, latestAssistantTextInActive, pageContext]);

  const showAgentGuide = useMemo(() => {
    if (!active) return false;
    if (inChatAssessment && inChatAssessment.sessionId === active.id) return false;
    const userMessageCount = active.messages.filter(
      (message) => message.role === "user"
    ).length;

    if (userMessageCount <= 2) return true;
    return userMessageCount <= 4 && interactiveActions.length === 0;
  }, [active, interactiveActions.length, inChatAssessment]);

  const showAgentCapabilityHub = useMemo(() => {
    if (!active) return false;
    if (inChatAssessment && inChatAssessment.sessionId === active.id) return false;
    const userMessageCount = active.messages.filter(
      (message) => message.role === "user"
    ).length;
    return userMessageCount <= 8;
  }, [active, inChatAssessment]);

  const buildSummaryForSession = (sessionId: string | null) => {
    return buildUserContextSummary(
      buildUserContextInput({
        profile,
        orders,
        assessResult,
        checkAiResult,
        sessions,
        currentSessionId: sessionId,
        localAssessCats,
        localCheckAi,
        actorContext: {
          loggedIn: actorLoggedInRef.current,
          phoneLinked: actorPhoneLinkedRef.current,
        },
      })
    );
  };
  const buildActionContextText = (sessionId: string | null) => {
    const summaryText = buildSummaryForSession(sessionId).promptSummaryText;
    return [summaryText, runtimeContextText].filter(Boolean).join("\n\n");
  };

  const userContextSummary = useMemo(
    () => buildSummaryForSession(activeId),
    [
      profile,
      orders,
      assessResult,
      checkAiResult,
      sessions,
      activeId,
      localAssessCats,
      localCheckAi,
      runtimeContextText,
    ]
  );

  const buildContextPayload = (currentSessionId: string | null) => {
    return buildChatContextPayload({
      profile,
      orders,
      assessResult,
      checkAiResult,
      sessions,
      currentSessionId,
      localAssessCats,
      localCheckAi,
      actorContext: {
        loggedIn: actorLoggedInRef.current,
        phoneLinked: actorPhoneLinkedRef.current,
      },
    });
  };

  const buildRuntimeContextPayload = () => {
    if (!pageContext) return null;
    return {
      routeKey: pageContext.routeKey,
      routePath: pageContext.routePath,
      pageTitle: pageContext.title,
      pageSummary: pageContext.summary,
      suggestedPrompts: pageContext.suggestedPrompts,
      runtimeContextText,
    };
  };

  const prevActiveIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const msgLength = active.messages.length;
    if (prevActiveIdRef.current !== activeId) {
      requestAnimationFrame(() => {
        scrollToTop();
      });
      prevActiveIdRef.current = activeId;
      prevMsgCountRef.current = msgLength;
      return;
    }

    if (msgLength > prevMsgCountRef.current) {
      requestAnimationFrame(() => {
        if (stickToBottomRef.current) scrollToBottom();
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
      stickToBottomRef.current = isAtBottom();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [messagesContainerRef.current]);

  function scrollToBottom() {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }

  function scrollToTop() {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = 0;
  }

  function isAtBottom(threshold = 80) {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      threshold
    );
  }

  function newChat() {
    const created = createNewChatSession({
      sessions,
      actor: {
        loggedIn: actorLoggedInRef.current,
        appUserId: actorAppUserIdRef.current,
      },
    });

    setSessions(created.nextSessions);
    setActiveId(created.id);
    setSuggestions([]);
    setInteractiveActions([]);
    setInChatAssessment(null);
    firstUserMessageRef.current = "";
    firstAssistantMessageRef.current = "";
    firstAssistantReplyRef.current = "";
    setTitleLoading(false);
    setTitleError(false);
    readyToPersistRef.current[created.id] = false;
    suggestionHistoryRef.current[created.id] = [];
  }

  async function deleteChat(id: string) {
    const prevSessions = sessions;
    const prevActiveId = activeId;
    const prevReady = { ...readyToPersistRef.current };

    const nextState = deleteChatSessionState({
      sessions,
      activeId,
      deleteId: id,
    });
    setSessions(nextState.nextSessions);
    setActiveId(nextState.nextActiveId);
    if (inChatAssessment?.sessionId === id) {
      setInChatAssessment(null);
    }

    delete readyToPersistRef.current[id];
    delete suggestionHistoryRef.current[id];

    try {
      await requestDeleteChatSession(id);
    } catch {
      readyToPersistRef.current = prevReady;
      setSessions(prevSessions);
      setActiveId(prevActiveId);
    }
  }

  function renameChat(id: string, title: string) {
    setSessions((prev) => updateSessionTitle(prev, id, title));
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

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
      clearSuggestionsAndActions: () => {
        setSuggestions([]);
        setInteractiveActions([]);
      },
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
      clearSuggestionsAndActions: () => {
        setSuggestions([]);
        setInteractiveActions([]);
      },
      updateAssistantMessage,
      finalizeAssistantTurn,
      setLocalCheckAi,
      setCheckAiResult,
      setLocalAssessCats,
      setAssessResult,
      getTzOffsetMinutes,
    });
  }

  async function executeCartCommandText(params: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) {
    const parsed = await parseCartCommandFromMessages({
      text: params.commandText,
      messages: params.sessionMessages,
    });
    if (!parsed) {
      return { executed: false, summary: "", hasAddress: hasRoadAddressInLocalStorage() };
    }

    dispatchChatCartActionRequest({
      source: "chat-command",
      openCartAfterSave: parsed.openCartAfterSave,
      items: parsed.items.map((entry) => ({
        productId: entry.recommendation.productId,
        productName: entry.recommendation.productName,
        optionType: entry.recommendation.optionType,
        quantity: entry.quantity,
      })),
    });

    return {
      executed: true,
      summary: formatCartCommandSummary(parsed.items),
      hasAddress: hasRoadAddressInLocalStorage(),
      openCartAfterSave: parsed.openCartAfterSave,
    };
  }

  async function runInteractiveAction(
    action: ChatActionType,
    sessionMessages: ChatMessage[]
  ) {
    return runSingleInteractiveActionFlow({
      action,
      sessionMessages,
      executeCartCommandText,
      openCart: openCartFromChat,
      clearCart: clearCartFromChat,
      openProfileSettings: () => setShowSettings(true),
      resetInChatAssessment: () => setInChatAssessment(null),
      startInChatAssessment: (mode) => {
        const sessionId = activeIdRef.current;
        if (!sessionId) return null;
        return initializeInChatAssessment(sessionId, mode);
      },
      navigateTo,
      openExternalLink,
    });
  }

  async function runAgentDecision(params: {
    decision: ChatAgentExecuteDecision;
    sessionMessages: ChatMessage[];
  }) {
    return runAgentDecisionFlow({
      decision: params.decision,
      sessionMessages: params.sessionMessages,
      executeCartCommandText,
      runSingleInteractiveAction: runInteractiveAction,
    });
  }

  async function tryHandleCartCommand(params: {
    text: string;
    sessionId: string;
    sessionMessages: ChatMessage[];
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    isFirst: boolean;
  }) {
    const result = await executeCartCommandText({
      commandText: params.text,
      sessionMessages: params.sessionMessages,
    });
    if (!result.executed) return false;

    const fullText = result.hasAddress
      ? result.openCartAfterSave
        ? `요청한 제품을 장바구니에 담고 바로 구매를 진행할 수 있게 열어둘게요. ${result.summary}`
        : `요청한 제품을 장바구니에 담았어요. ${result.summary}`
      : `요청한 제품을 담을 수 있도록 주소 입력 창을 열었어요. 주소를 입력하면 자동으로 담아둘게요. ${result.summary}`;

    updateAssistantMessage(params.sessionId, params.assistantMessage.id, fullText);

    await finalizeAssistantTurn({
      sessionId: params.sessionId,
      content: fullText,
      assistantMessage: params.assistantMessage,
      userMessage: params.userMessage,
      isFirst: params.isFirst,
    });

    return true;
  }

  async function tryHandleAgentActionDecision(params: {
    text: string;
    sessionId: string;
    sessionMessages: ChatMessage[];
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    isFirst: boolean;
  }) {
    if (!isLikelyActionIntentText(params.text, params.sessionMessages)) {
      return false;
    }

    let decision: ChatAgentExecuteDecision = {
      handled: false,
      assistantReply: "",
      actions: [],
      cartIntent: { mode: "none" },
      confidence: 0,
    };

    try {
      decision = await requestActionExecutionDecision({
        text: params.text,
        recentMessages: params.sessionMessages.slice(-10),
        contextSummaryText: buildActionContextText(params.sessionId),
        runtimeContextText,
      });
    } catch {
      return false;
    }

    if (
      !decision.handled &&
      decision.actions.length === 0 &&
      decision.cartIntent.mode === "none"
    ) {
      return false;
    }

    const result = await runAgentDecision({
      decision,
      sessionMessages: params.sessionMessages,
    });
    if (!result.executed) return false;
    rememberExecutedActions(result.executedActions);

    const fullText = result.summary
      ? `${result.message} ${result.summary}`.trim()
      : result.message;

    updateAssistantMessage(params.sessionId, params.assistantMessage.id, fullText);

    await finalizeAssistantTurn({
      sessionId: params.sessionId,
      content: fullText,
      assistantMessage: params.assistantMessage,
      userMessage: params.userMessage,
      isFirst: params.isFirst,
    });

    return true;
  }

  async function handleInteractiveAction(actionType: ChatActionType) {
    if (!active || loading || actionLoading) return;

    const now = Date.now();
    const recent = lastInteractiveActionRef.current;
    if (recent && recent.type === actionType && now - recent.at < 900) {
      return;
    }
    lastInteractiveActionRef.current = { type: actionType, at: now };

    setActionLoading(true);
    try {
      const result = await runInteractiveAction(
        actionType,
        active.messages || []
      );
      if (!result.executed) return;
      rememberExecutedActions([actionType]);

      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: result.summary
          ? `${result.message} ${result.summary}`.trim()
          : result.message,
        createdAt: now,
      };

      setSessions((prev) =>
        appendMessagesToSession(prev, active.id, [assistantMessage])
      );

      await finalizeAssistantTurn({
        sessionId: active.id,
        content: assistantMessage.content,
        assistantMessage,
      });
    } finally {
      setActionLoading(false);
    }
  }

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
    setSuggestions([]);
    setInteractiveActions([]);
    if (isFirst) firstUserMessageRef.current = text;

    setSessions((prev) =>
      appendMessagesToSession(prev, sessionId, [userMessage, assistantMessage], now)
    );

    stickToBottomRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));

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
            OFFLINE_CHAT_MESSAGE
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
        const errText = (error as Error).message || "문제가 발생했어요.";
        updateAssistantMessage(sessionId, assistantMessage.id, `오류: ${errText}`);
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
      offlineMessage: OFFLINE_INIT_MESSAGE,
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

  function handleProfileChange(nextProfile?: UserProfile) {
    if (!nextProfile) {
      setProfile(undefined);
      saveProfileLocal(undefined as any);
      saveProfileServer(undefined as any);
      return;
    }

    if (typeof nextProfile === "object" && Object.keys(nextProfile).length === 0) {
      return;
    }

    setProfile(nextProfile);
    saveProfileLocal(nextProfile);
    saveProfileServer(nextProfile);
  }

  function cancelInChatAssessment() {
    if (!inChatAssessment) return;
    if (!activeId || inChatAssessment.sessionId !== activeId) {
      setInChatAssessment(null);
      return;
    }
    const assistantMessage: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "대화형 검사를 중단했어요. 원하면 다시 시작해 주세요.",
      createdAt: Date.now(),
    };
    setInChatAssessment(null);
    setSessions((prev) =>
      appendMessagesToSession(prev, activeId, [assistantMessage])
    );
  }

  function openAssessmentPageFromChat(mode: InChatAssessmentMode) {
    setInChatAssessment(null);
    if (mode === "quick") {
      navigateTo("/check-ai");
      return;
    }
    navigateTo("/assess");
  }

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
