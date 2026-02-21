"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import { buildDataDrivenSuggestions, buildUserContextSummary } from "@/lib/chat/context";
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
import { createDraftSession, DEFAULT_CHAT_TITLE, mergeServerSessions } from "./useChat.session";
import {
  buildFinalSuggestions,
  getSuggestionHistory,
  rememberSuggestions,
} from "./useChat.suggestions";
import { readStreamingText } from "./useChat.stream";
import { normalizeNewlines, sanitizeAssistantText } from "./useChat.text";
import { hydrateRecommendationPrices } from "./useChat.recommendation";
import {
  readActionMemory,
  rememberActionMemoryList,
  sortActionsByMemory,
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
import {
  evaluateDeepAssessAnswers,
  evaluateQuickCheckAnswers,
} from "./useChat.evaluation";
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
  DEEP_CHAT_QUESTIONS,
  QUICK_CHAT_QUESTIONS,
  buildInChatAssessmentPrompt,
  createAssessmentResultSummary,
  findNextAssessmentIndex,
  formatAssessmentQuestionPrompt,
  isAssessmentCancelIntent,
  isAssessmentEscapeIntent,
  parseChoiceAnswer,
  parseNumberAnswer,
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
import {
  buildFallbackInteractiveActions,
  runAgentDecision as runAgentDecisionFlow,
} from "./useChat.agentDecision";
import {
  requestActionExecutionDecision,
  requestActionSuggestions,
  requestChatStream,
  requestChatSuggestions,
  requestChatTitle,
} from "./useChat.api";
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
      const id = uid();
      const now = Date.now();
      setSessions([
        createDraftSession({
          id,
          now,
          actor: {
            loggedIn: actorLoggedInRef.current,
            appUserId: actorAppUserIdRef.current,
          },
        }),
      ]);
      setActiveId(id);
      readyToPersistRef.current[id] = false;
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

    const persistable = sessions.filter((session) => {
      const first = session.messages[0];
      if (first && first.role === "assistant") {
        return !!readyToPersistRef.current[session.id];
      }
      return true;
    });

    saveSessions(persistable);
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
    const id = uid();
    const now = Date.now();

    const session = createDraftSession({
      id,
      now,
      actor: {
        loggedIn: actorLoggedInRef.current,
        appUserId: actorAppUserIdRef.current,
      },
    });

    setSessions([session, ...sessions]);
    setActiveId(id);
    setSuggestions([]);
    setInteractiveActions([]);
    setInChatAssessment(null);
    firstUserMessageRef.current = "";
    firstAssistantMessageRef.current = "";
    firstAssistantReplyRef.current = "";
    setTitleLoading(false);
    setTitleError(false);
    readyToPersistRef.current[id] = false;
    suggestionHistoryRef.current[id] = [];
  }

  async function deleteChat(id: string) {
    const prevSessions = sessions;
    const prevActiveId = activeId;
    const prevReady = { ...readyToPersistRef.current };

    const next = sessions.filter((session) => session.id !== id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    if (inChatAssessment?.sessionId === id) {
      setInChatAssessment(null);
    }

    delete readyToPersistRef.current[id];
    delete suggestionHistoryRef.current[id];

    try {
      const response = await fetch("/api/chat/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat session");
      }
    } catch {
      readyToPersistRef.current = prevReady;
      setSessions(prevSessions);
      setActiveId(prevActiveId);
    }
  }

  function renameChat(id: string, title: string) {
    setSessions((prev) =>
      prev.map((session) => (session.id === id ? { ...session, title } : session))
    );
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function updateAssistantMessage(sessionId: string, messageId: string, content: string) {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              updatedAt: Date.now(),
              messages: session.messages.map((message) =>
                message.id === messageId ? { ...message, content } : message
              ),
            }
          : session
      )
    );
  }

  async function saveChatOnce({
    clientId,
    sessionId,
    title,
    messages,
    tzOffsetMinutes,
  }: {
    clientId: string;
    sessionId: string;
    title?: string;
    messages: ChatMessage[];
    tzOffsetMinutes: number;
  }) {
    const key = `${sessionId}:${messages.map((message) => message.id).join(",")}`;
    if (savedKeysRef.current.has(key)) return;

    savedKeysRef.current.add(key);
    await fetch("/api/chat/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        sessionId,
        title,
        messages,
        tzOffsetMinutes,
      }),
    });
  }

  async function finalizeAssistantTurn(input: {
    sessionId: string;
    content: string;
    assistantMessage: ChatMessage;
    userMessage?: ChatMessage;
    isFirst?: boolean;
  }) {
    if (input.isFirst) {
      firstAssistantReplyRef.current = input.content;
      await generateTitle();
    }

    await Promise.all([
      fetchSuggestions(input.content, input.sessionId),
      fetchInteractiveActions(input.content, input.sessionId),
    ]);

    try {
      const clientId = getClientIdLocal();
      const tzOffsetMinutes = getTzOffsetMinutes();
      const persistedMessages = input.userMessage
        ? [input.userMessage, { ...input.assistantMessage, content: input.content }]
        : [{ ...input.assistantMessage, content: input.content }];

      await saveChatOnce({
        clientId,
        sessionId: input.sessionId,
        title:
          sessions.find((session) => session.id === input.sessionId)?.title ||
          DEFAULT_CHAT_TITLE,
        messages: persistedMessages,
        tzOffsetMinutes,
      });
    } catch {}
  }

  async function generateTitle() {
    if (
      !firstUserMessageRef.current ||
      !firstAssistantMessageRef.current ||
      !firstAssistantReplyRef.current ||
      !activeId
    ) {
      return;
    }

    setTitleLoading(true);
    setTitleError(false);

    try {
      const title = await requestChatTitle({
        firstUserMessage: firstUserMessageRef.current,
        firstAssistantMessage: firstAssistantMessageRef.current,
        assistantReply: firstAssistantReplyRef.current,
      });

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeId ? { ...session, title } : session
        )
      );
      setTitleHighlightId(activeId);
      setTopTitleHighlight(true);
      setTimeout(() => {
        setTitleHighlightId(null);
        setTopTitleHighlight(false);
      }, 1500);
    } catch {
      setTitleError(true);
    } finally {
      setTitleLoading(false);
    }
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

    const safeCount = 2;
    const recentSuggestionHistory = getSuggestionHistory(
      suggestionHistoryRef.current,
      targetSessionId
    ).slice(-8);
    const summaryForSession = buildSummaryForSession(targetSessionId);
    const fallback = buildDataDrivenSuggestions(
      summaryForSession,
      safeCount,
      recentSuggestionHistory
    );
    const recentMessages =
      sessions.find((session) => session.id === targetSessionId)?.messages ?? [];

    try {
      const fromApi = await requestChatSuggestions({
        text: lastAssistantText,
        contextPayload: buildContextPayload(targetSessionId),
        runtimeContextText,
        recentMessages,
        excludeSuggestions: recentSuggestionHistory,
        count: safeCount,
      });

      const finalSuggestions = buildFinalSuggestions({
        fromApi,
        fallback,
        recentSuggestionHistory,
        safeCount,
      });

      setSuggestions(finalSuggestions);
      rememberSuggestions(
        suggestionHistoryRef.current,
        targetSessionId,
        finalSuggestions
      );
    } catch {
      const finalSuggestions = buildFinalSuggestions({
        fromApi: [],
        fallback,
        recentSuggestionHistory,
        safeCount,
      });

      setSuggestions(finalSuggestions);
      rememberSuggestions(
        suggestionHistoryRef.current,
        targetSessionId,
        finalSuggestions
      );
    }
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
    if (inChatAssessment && inChatAssessment.sessionId === targetSessionId) {
      setInteractiveActions([]);
      return;
    }

    const recentMessages =
      sessions.find((session) => session.id === targetSessionId)?.messages ?? [];
    const contextSummaryText = buildActionContextText(targetSessionId);

    try {
      const mapped = await requestActionSuggestions({
        assistantText: lastAssistantText,
        recentMessages,
        contextSummaryText,
        runtimeContextText,
      });

      if ((activeIdRef.current || "") !== targetSessionId) return;
      const prioritizedMapped = sortActionsByMemory(mapped, actionMemory);
      const fallbackRows = sortActionsByMemory(
        buildFallbackInteractiveActions(lastAssistantText),
        actionMemory
      );
      setInteractiveActions(
        prioritizedMapped.length > 0
          ? prioritizedMapped.slice(0, 4)
          : fallbackRows.slice(0, 4)
      );
    } catch {
      if ((activeIdRef.current || "") !== targetSessionId) return;
      setInteractiveActions(
        sortActionsByMemory(buildFallbackInteractiveActions(lastAssistantText), actionMemory).slice(
          0,
          4
        )
      );
    }
  }

  function initializeInChatAssessment(
    sessionId: string,
    mode: InChatAssessmentMode
  ): string {
    const questions = (mode === "quick" ? QUICK_CHAT_QUESTIONS : DEEP_CHAT_QUESTIONS).slice();
    const initialState: InChatAssessmentState = {
      sessionId,
      mode,
      questions,
      currentIndex: 0,
      answers: {},
    };
    setInChatAssessment(initialState);
    setSuggestions([]);
    setInteractiveActions([]);
    return [
      mode === "quick"
        ? "좋아요. 페이지 이동 없이 대화형 빠른검사를 시작할게요."
        : "좋아요. 페이지 이동 없이 대화형 정밀검사를 시작할게요.",
      formatAssessmentQuestionPrompt({
        mode,
        index: 0,
        total: questions.length,
        question: questions[0],
      }),
    ].join("\n\n");
  }

  async function tryHandleInChatAssessmentInput(params: {
    text: string;
    sessionId: string;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    isFirst: boolean;
  }) {
    const state = inChatAssessment;
    if (!state || state.sessionId !== params.sessionId) return false;

    if (isAssessmentEscapeIntent(params.text)) {
      setInChatAssessment(null);
      return false;
    }

    if (isAssessmentCancelIntent(params.text)) {
      setInChatAssessment(null);
      setSuggestions([]);
      setInteractiveActions([]);
      const cancelText = "대화형 검사를 중단했어요. 원하면 다시 시작해 주세요.";
      updateAssistantMessage(params.sessionId, params.assistantMessage.id, cancelText);
      return true;
    }

    const currentQuestion = state.questions[state.currentIndex];
    if (!currentQuestion) {
      setInChatAssessment(null);
      return false;
    }

    const parsed =
      currentQuestion.kind === "number"
        ? parseNumberAnswer(params.text, currentQuestion)
        : parseChoiceAnswer(params.text, currentQuestion);

    if (!parsed) {
      const guide =
        currentQuestion.kind === "number"
          ? `숫자로 답변해 주세요.${typeof currentQuestion.min === "number" && typeof currentQuestion.max === "number" ? ` (${currentQuestion.min}~${currentQuestion.max})` : ""}`
          : "아래 선택지 버튼을 누르거나 번호(예: 1번)로 답변해 주세요.";
      const retryText = `${guide}\n\n${formatAssessmentQuestionPrompt({
        mode: state.mode,
        index: state.currentIndex,
        total: state.questions.length,
        question: currentQuestion,
      })}`;
      updateAssistantMessage(params.sessionId, params.assistantMessage.id, retryText);
      return true;
    }

    const nextAnswers = {
      ...state.answers,
      [currentQuestion.id]: parsed.parsed,
    };
    const nextIndex = findNextAssessmentIndex(
      state.questions,
      nextAnswers,
      state.currentIndex + 1
    );

    if (nextIndex >= 0) {
      const nextState: InChatAssessmentState = {
        ...state,
        answers: nextAnswers,
        currentIndex: nextIndex,
      };
      setInChatAssessment(nextState);
      const nextQuestion = nextState.questions[nextState.currentIndex];
      const nextText = [
        `${currentQuestion.id} 응답: ${parsed.label}`,
        "",
        formatAssessmentQuestionPrompt({
          mode: nextState.mode,
          index: nextState.currentIndex,
          total: nextState.questions.length,
          question: nextQuestion,
        }),
      ].join("\n");
      updateAssistantMessage(params.sessionId, params.assistantMessage.id, nextText);
      return true;
    }

    setInChatAssessment(null);
    setSuggestions([]);
    setInteractiveActions([]);

    const result =
      state.mode === "quick"
        ? await evaluateQuickCheckAnswers({
            answers: nextAnswers,
            setLocalCheckAi,
            setCheckAiResult,
            getTzOffsetMinutes,
          })
        : await evaluateDeepAssessAnswers({
            answers: nextAnswers,
            setLocalAssessCats,
            setAssessResult,
            getTzOffsetMinutes,
          });

    const doneText = [
      `${currentQuestion.id} 응답: ${parsed.label}`,
      "",
      createAssessmentResultSummary({
        mode: state.mode,
        labels: result.labels,
        percents: result.percents,
      }),
      "",
      state.mode === "quick"
        ? "원하면 지금 정밀검사(대화형)도 이어서 진행할 수 있어요."
        : "원하면 추천 카테고리 기준으로 제품 탐색도 바로 도와드릴게요.",
    ].join("\n");

    updateAssistantMessage(params.sessionId, params.assistantMessage.id, doneText);

    await finalizeAssistantTurn({
      sessionId: params.sessionId,
      content: doneText,
      assistantMessage: params.assistantMessage,
      userMessage: params.userMessage,
      isFirst: params.isFirst,
    });

    return true;
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
        prev.map((session) =>
          session.id === active.id
            ? {
                ...session,
                updatedAt: Date.now(),
                messages: [...session.messages, assistantMessage],
              }
            : session
        )
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
    if (loading) return;
    if (!active) return;

    const text = (overrideText ?? input).trim();
    if (!text) return;

    const isFirst = active.messages.length === 1;
    setInput("");
    setSuggestions([]);
    setInteractiveActions([]);
    if (isFirst) firstUserMessageRef.current = text;

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: normalizeNewlines(text),
      createdAt: now,
    };
    const assistantMessage: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === active.id
          ? {
              ...session,
              updatedAt: Date.now(),
              messages: [...session.messages, userMessage, assistantMessage],
            }
          : session
      )
    );

    stickToBottomRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));

    const handledByInChatAssessment = await tryHandleInChatAssessmentInput({
      text,
      sessionId: active.id,
      userMessage,
      assistantMessage,
      isFirst,
    });
    if (handledByInChatAssessment) return;

    if (!isBrowserOnline()) {
      updateAssistantMessage(active.id, assistantMessage.id, OFFLINE_CHAT_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const handledByAgentAction = await tryHandleAgentActionDecision({
        text,
        sessionId: active.id,
        sessionMessages: active.messages || [],
        userMessage,
        assistantMessage,
        isFirst,
      });
      if (handledByAgentAction) return;

      const handledByCommand = await tryHandleCartCommand({
        text,
        sessionId: active.id,
        sessionMessages: active.messages || [],
        userMessage,
        assistantMessage,
        isFirst,
      });
      if (handledByCommand) return;

      const controller = new AbortController();
      abortRef.current = controller;
      const clientId = getClientIdLocal();
      const contextPayload = buildContextPayload(active.id);
      const response = await requestChatStream({
        mode: "chat",
        messages: (active.messages || []).concat(userMessage),
        clientId,
        contextPayload,
        runtimeContext: buildRuntimeContextPayload(),
        signal: controller.signal,
      });

      let fullText = await readStreamingText(response, (textSoFar) => {
        updateAssistantMessage(
          active.id,
          assistantMessage.id,
          textSoFar
        );
      });

      const finalizedText = sanitizeAssistantText(fullText, true);
      if (finalizedText !== fullText) {
        fullText = finalizedText;
      }
      try {
        fullText = await hydrateRecommendationPrices(fullText);
      } catch {}

      updateAssistantMessage(active.id, assistantMessage.id, fullText);

      await finalizeAssistantTurn({
        sessionId: active.id,
        content: fullText,
        assistantMessage,
        userMessage,
        isFirst,
      });
    } catch (error) {
      if ((error as any)?.name !== "AbortError") {
        const errText = (error as Error).message || "문제가 발생했어요.";
        updateAssistantMessage(active.id, assistantMessage.id, `오류: ${errText}`);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function startInitialAssistantMessage(sessionId: string) {
    if (!resultsLoaded) return;
    if (initStartedRef.current[sessionId]) return;

    initStartedRef.current[sessionId] = true;
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || session.messages.length > 0) return;

    const now = Date.now();
    const assistantMessage: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId ? { ...item, messages: [assistantMessage] } : item
      )
    );

    if (!isBrowserOnline()) {
      updateAssistantMessage(sessionId, assistantMessage.id, OFFLINE_INIT_MESSAGE);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const clientId = getClientIdLocal();
      const contextPayload = buildContextPayload(sessionId);
      const response = await requestChatStream({
        mode: "init",
        messages: [],
        clientId,
        contextPayload,
        runtimeContext: buildRuntimeContextPayload(),
        signal: controller.signal,
      });

      let fullText = await readStreamingText(response, (textSoFar) => {
        updateAssistantMessage(
          sessionId,
          assistantMessage.id,
          textSoFar
        );
      });

      const finalizedText = sanitizeAssistantText(fullText, true);
      if (finalizedText !== fullText) {
        fullText = finalizedText;
      }
      try {
        fullText = await hydrateRecommendationPrices(fullText);
      } catch {}

      updateAssistantMessage(sessionId, assistantMessage.id, fullText);
      fetchSuggestions(fullText, sessionId).catch(() => {});
      fetchInteractiveActions(fullText, sessionId).catch(() => {});
      firstAssistantMessageRef.current = fullText;

      try {
        const tzOffsetMinutes = getTzOffsetMinutes();
        const clientId2 = getClientIdLocal();
        await saveChatOnce({
          clientId: clientId2,
          sessionId,
          messages: [{ ...assistantMessage, content: fullText }],
          tzOffsetMinutes,
        });
        readyToPersistRef.current[sessionId] = true;
        setSessions((prev) => prev.slice());
      } catch {}
    } catch (error) {
      if ((error as any)?.name !== "AbortError") {
        const errText = (error as Error).message || "문제가 발생했어요.";
        setSessions((prev) =>
          prev.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: Date.now(),
                  messages: item.messages.map((message) =>
                    message.role === "assistant" && message.content === ""
                      ? { ...message, content: `오류: ${errText}` }
                      : message
                  ),
                }
              : item
          )
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
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
      prev.map((session) =>
        session.id === activeId
          ? {
              ...session,
              updatedAt: Date.now(),
              messages: [...session.messages, assistantMessage],
            }
          : session
      )
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
