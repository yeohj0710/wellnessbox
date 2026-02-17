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
  getSuggestionHistory,
  normalizeSuggestionKey,
  pickFreshSuggestions,
  rememberSuggestions,
} from "./useChat.suggestions";
import { readStreamingText } from "./useChat.stream";
import { normalizeNewlines, sanitizeAssistantText } from "./useChat.text";
import {
  formatCartCommandSummary,
  hasRoadAddressInLocalStorage,
  parseCartCommandFromMessages,
} from "./useChat.cart-command";
import { dispatchChatCartActionRequest } from "@/lib/chat/cart-action-events";
import {
  CHAT_ACTION_LABELS,
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import {
  buildSyntheticCartCommand,
  hasRecommendationSection,
  isLikelyActionIntentText,
  normalizeActionTypeList,
} from "./useChat.agentActions";

type UseChatOptions = {
  manageFooter?: boolean;
  remoteBootstrap?: boolean;
  enableAutoInit?: boolean;
};

const OFFLINE_INIT_MESSAGE =
  "지금 네트워크 연결이 불안정해서 초기 상담 내용을 불러오지 못했어요. 연결이 복구되면 새로고침 없이 다시 이어서 도와드릴게요.";
const OFFLINE_CHAT_MESSAGE =
  "지금 네트워크 연결이 불안정해서 답변을 불러오지 못했어요. 연결이 안정되면 같은 질문을 다시 보내 주세요.";

function isBrowserOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export default function useChat(options: UseChatOptions = {}) {
  const manageFooter = options.manageFooter ?? true;
  const remoteBootstrap = options.remoteBootstrap ?? true;
  const enableAutoInit = options.enableAutoInit ?? true;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [topTitleHighlight, setTopTitleHighlight] = useState(false);

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

  function requestCloseDock() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("wb:chat-close-dock"));
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

  function buildFinalSuggestions(input: {
    fromApi: string[];
    fallback: string[];
    recentSuggestionHistory: string[];
    safeCount: number;
  }) {
    const pickedFromApi = pickFreshSuggestions({
      pool: input.fromApi,
      recentSuggestionHistory: input.recentSuggestionHistory,
      count: input.safeCount,
    });

    const remainder = Math.max(0, input.safeCount - pickedFromApi.length);
    const pickedFallback =
      remainder > 0
        ? pickFreshSuggestions({
            pool: input.fallback.filter((item) => {
              const key = normalizeSuggestionKey(item);
              return !pickedFromApi.some(
                (selected) => normalizeSuggestionKey(selected) === key
              );
            }),
            recentSuggestionHistory: input.recentSuggestionHistory,
            count: remainder,
          })
        : [];

    const picked = pickedFromApi.concat(pickedFallback).slice(0, input.safeCount);
    const safeFallback = pickFreshSuggestions({
      pool: input.fallback,
      recentSuggestionHistory: input.recentSuggestionHistory,
      count: input.safeCount,
    });

    if (picked.length > 0) return picked;
    if (safeFallback.length > 0) return safeFallback;
    return input.fallback.slice(0, input.safeCount);
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
      const response = await fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstUserMessage: firstUserMessageRef.current,
          firstAssistantMessage: firstAssistantMessageRef.current,
          assistantReply: firstAssistantReplyRef.current,
        }),
      });

      const json = await response.json().catch(() => ({}));
      const title =
        typeof json?.title === "string" && json.title
          ? json.title
          : DEFAULT_CHAT_TITLE;

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

    try {
      const response = await fetch("/api/chat/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lastAssistantText,
          ...buildContextPayload(targetSessionId),
          recentMessages:
            sessions.find((session) => session.id === targetSessionId)?.messages ??
            [],
          excludeSuggestions: recentSuggestionHistory,
          count: safeCount,
        }),
      });

      const json = await response.json().catch(() => ({}));
      const fromApi = Array.isArray(json?.suggestions)
        ? json.suggestions
            .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean)
        : [];

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

  function normalizeExecuteDecision(raw: unknown): ChatAgentExecuteDecision {
    const data = raw && typeof raw === "object" ? (raw as any) : {};
    const cartIntentRaw =
      data.cartIntent && typeof data.cartIntent === "object"
        ? (data.cartIntent as any)
        : {};
    const cartIntentMode =
      cartIntentRaw.mode === "add_all" ||
      cartIntentRaw.mode === "buy_all" ||
      cartIntentRaw.mode === "add_named" ||
      cartIntentRaw.mode === "buy_named"
        ? cartIntentRaw.mode
        : "none";

    return {
      handled: data.handled === true,
      assistantReply:
        typeof data.assistantReply === "string"
          ? data.assistantReply.trim().slice(0, 240)
          : "",
      actions: normalizeActionTypeList(data.actions),
      cartIntent: {
        mode: cartIntentMode,
        targetProductName:
          typeof cartIntentRaw.targetProductName === "string"
            ? cartIntentRaw.targetProductName.trim().slice(0, 80)
            : undefined,
        quantity:
          typeof cartIntentRaw.quantity === "number"
            ? Math.max(1, Math.min(20, Math.floor(cartIntentRaw.quantity)))
            : 1,
      },
      confidence:
        typeof data.confidence === "number"
          ? Math.max(0, Math.min(1, data.confidence))
          : 0,
      reason:
        typeof data.reason === "string"
          ? data.reason.trim().slice(0, 180)
          : undefined,
    };
  }

  function buildFallbackInteractiveActions(lastAssistantText: string) {
    const hasRecommendation = hasRecommendationSection(lastAssistantText);
    const base: ChatActionType[] = hasRecommendation
      ? ["add_recommended_all", "buy_recommended_all", "open_cart", "open_profile"]
      : ["open_profile", "open_my_orders", "open_cart"];

    return base.map((type) => ({
      type,
      label: CHAT_ACTION_LABELS[type],
    }));
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

    const recentMessages =
      sessions.find((session) => session.id === targetSessionId)?.messages ?? [];
    const contextSummaryText = buildSummaryForSession(targetSessionId).promptSummaryText;

    try {
      const response = await fetch("/api/chat/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggest",
          assistantText: lastAssistantText,
          recentMessages,
          contextSummaryText,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json().catch(() => ({}));
      const rows = Array.isArray(json?.uiActions) ? json.uiActions : [];
      const mapped = normalizeActionTypeList(
        rows.map((item: any) => item?.type)
      ).map((type) => {
        const row = rows.find((item: any) => item?.type === type);
        return {
          type,
          label:
            typeof row?.label === "string" && row.label.trim()
              ? row.label.trim().slice(0, 40)
              : CHAT_ACTION_LABELS[type],
          reason:
            typeof row?.reason === "string"
              ? row.reason.trim().slice(0, 120)
              : undefined,
          confidence:
            typeof row?.confidence === "number"
              ? Math.max(0, Math.min(1, row.confidence))
              : undefined,
        } satisfies ChatAgentSuggestedAction;
      });

      if ((activeIdRef.current || "") !== targetSessionId) return;
      setInteractiveActions(
        mapped.length > 0
          ? mapped.slice(0, 4)
          : buildFallbackInteractiveActions(lastAssistantText).slice(0, 4)
      );
    } catch {
      if ((activeIdRef.current || "") !== targetSessionId) return;
      setInteractiveActions(buildFallbackInteractiveActions(lastAssistantText).slice(0, 4));
    }
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

  async function runSingleInteractiveAction(
    action: ChatActionType,
    sessionMessages: ChatMessage[]
  ) {
    if (action === "add_recommended_all" || action === "buy_recommended_all") {
      const result = await executeCartCommandText({
        commandText:
          action === "buy_recommended_all"
            ? "추천 상품 전체 바로 구매"
            : "추천 상품 전체 담아줘",
        sessionMessages,
      });
      return {
        executed: result.executed,
        message: result.executed
          ? result.hasAddress
            ? action === "buy_recommended_all"
              ? "추천 제품을 주문할 수 있도록 바로 열어둘게요."
              : "추천 제품을 장바구니에 담아둘게요."
            : "주소 입력이 필요해서 주소 입력 창부터 열어둘게요."
          : "",
        summary: result.summary,
        hasAddress: result.hasAddress,
      };
    }

    if (action === "open_cart") {
      if (typeof window !== "undefined") {
        requestCloseDock();
        localStorage.setItem("openCart", "true");
        window.dispatchEvent(new Event("openCart"));
      }
      return { executed: true, message: "장바구니를 열어둘게요.", summary: "" };
    }

    if (action === "open_profile") {
      setShowSettings(true);
      return { executed: true, message: "프로필 설정을 열어둘게요.", summary: "" };
    }

    if (action === "open_my_orders") {
      if (typeof window !== "undefined") {
        requestCloseDock();
        window.location.assign("/my-orders");
      }
      return { executed: true, message: "내 주문 조회 화면으로 이동할게요.", summary: "" };
    }

    if (action === "open_me") {
      if (typeof window !== "undefined") {
        requestCloseDock();
        window.location.assign("/me");
      }
      return { executed: true, message: "내 정보 화면으로 이동할게요.", summary: "" };
    }

    return { executed: false, message: "", summary: "" };
  }

  async function runAgentDecision(params: {
    decision: ChatAgentExecuteDecision;
    sessionMessages: ChatMessage[];
  }) {
    let executed = false;
    let summary = "";
    const messages: string[] = [];

    const syntheticCommand = buildSyntheticCartCommand({
      actions: params.decision.actions,
      cartIntent: params.decision.cartIntent,
    });
    if (syntheticCommand) {
      const cartResult = await executeCartCommandText({
        commandText: syntheticCommand,
        sessionMessages: params.sessionMessages,
      });
      if (cartResult.executed) {
        executed = true;
        summary = cartResult.summary;
        messages.push(
          cartResult.hasAddress
            ? cartResult.openCartAfterSave
              ? "요청한 추천 제품으로 바로 구매를 진행할 수 있게 열어둘게요."
              : "요청한 추천 제품을 장바구니에 담아둘게요."
            : "주소 입력이 필요해서 주소 입력 창부터 열어둘게요."
        );
      }
    }

    const nonCartActions = params.decision.actions.filter(
      (action) =>
        action !== "add_recommended_all" && action !== "buy_recommended_all"
    );

    for (const action of nonCartActions) {
      const result = await runSingleInteractiveAction(action, params.sessionMessages);
      if (!result.executed) continue;
      executed = true;
      if (result.summary) summary = result.summary;
      if (result.message) messages.push(result.message);
    }

    return {
      executed,
      summary,
      message:
        params.decision.assistantReply ||
        messages.find(Boolean) ||
        "요청하신 동작을 실행해둘게요.",
    };
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

    if (params.isFirst) {
      firstAssistantReplyRef.current = fullText;
      await generateTitle();
    }
    await Promise.all([
      fetchSuggestions(fullText, params.sessionId),
      fetchInteractiveActions(fullText, params.sessionId),
    ]);

    try {
      const clientId = getClientIdLocal();
      const tzOffsetMinutes = getTzOffsetMinutes();
      await saveChatOnce({
        clientId,
        sessionId: params.sessionId,
        title:
          sessions.find((session) => session.id === params.sessionId)?.title ||
          DEFAULT_CHAT_TITLE,
        messages: [
          params.userMessage,
          { ...params.assistantMessage, content: fullText },
        ],
        tzOffsetMinutes,
      });
    } catch {}

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
      const response = await fetch("/api/chat/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execute",
          text: params.text,
          recentMessages: params.sessionMessages.slice(-10),
          contextSummaryText: buildSummaryForSession(params.sessionId).promptSummaryText,
        }),
      });
      const json = await response.json().catch(() => ({}));
      decision = normalizeExecuteDecision(json);
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

    const fullText = result.summary
      ? `${result.message} ${result.summary}`.trim()
      : result.message;

    updateAssistantMessage(params.sessionId, params.assistantMessage.id, fullText);

    if (params.isFirst) {
      firstAssistantReplyRef.current = fullText;
      await generateTitle();
    }
    await Promise.all([
      fetchSuggestions(fullText, params.sessionId),
      fetchInteractiveActions(fullText, params.sessionId),
    ]);

    try {
      const clientId = getClientIdLocal();
      const tzOffsetMinutes = getTzOffsetMinutes();
      await saveChatOnce({
        clientId,
        sessionId: params.sessionId,
        title:
          sessions.find((session) => session.id === params.sessionId)?.title ||
          DEFAULT_CHAT_TITLE,
        messages: [
          params.userMessage,
          { ...params.assistantMessage, content: fullText },
        ],
        tzOffsetMinutes,
      });
    } catch {}

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
      const result = await runSingleInteractiveAction(
        actionType,
        active.messages || []
      );
      if (!result.executed) return;

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

      await Promise.all([
        fetchSuggestions(assistantMessage.content, active.id),
        fetchInteractiveActions(assistantMessage.content, active.id),
      ]);

      try {
        const clientId = getClientIdLocal();
        const tzOffsetMinutes = getTzOffsetMinutes();
        await saveChatOnce({
          clientId,
          sessionId: active.id,
          title:
            sessions.find((session) => session.id === active.id)?.title ||
            DEFAULT_CHAT_TITLE,
          messages: [assistantMessage],
          tzOffsetMinutes,
        });
      } catch {}
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

    if (!isBrowserOnline()) {
      updateAssistantMessage(active.id, assistantMessage.id, OFFLINE_CHAT_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const handledByCommand = await tryHandleCartCommand({
        text,
        sessionId: active.id,
        sessionMessages: active.messages || [],
        userMessage,
        assistantMessage,
        isFirst,
      });
      if (handledByCommand) return;

      const handledByAgentAction = await tryHandleAgentActionDecision({
        text,
        sessionId: active.id,
        sessionMessages: active.messages || [],
        userMessage,
        assistantMessage,
        isFirst,
      });
      if (handledByAgentAction) return;

      const controller = new AbortController();
      abortRef.current = controller;
      const clientId = getClientIdLocal();
      const contextPayload = buildContextPayload(active.id);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: (active.messages || []).concat(userMessage),
          clientId,
          mode: "chat",
          ...contextPayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("대화를 이어받지 못했어요.");
      }

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

      updateAssistantMessage(active.id, assistantMessage.id, fullText);

      if (isFirst) {
        firstAssistantReplyRef.current = fullText;
        await generateTitle();
      }
      await Promise.all([
        fetchSuggestions(fullText, active.id),
        fetchInteractiveActions(fullText, active.id),
      ]);

      try {
        const tzOffsetMinutes = getTzOffsetMinutes();
        await saveChatOnce({
          clientId,
          sessionId: active.id,
          title:
            sessions.find((session) => session.id === active.id)?.title ||
            DEFAULT_CHAT_TITLE,
          messages: [userMessage, { ...assistantMessage, content: fullText }],
          tzOffsetMinutes,
        });
      } catch {}
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          clientId,
          mode: "init",
          ...contextPayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("초기 메시지를 받아오지 못했어요.");
      }

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
    actionLoading,
    bootstrapPending,
    titleLoading,
    titleError,
    topTitleHighlight,
    messagesContainerRef,
    messagesEndRef,
    newChat,
    deleteChat,
    renameChat,
    stopStreaming,
    sendMessage,
    handleInteractiveAction,
    generateTitle,
    active,
    handleProfileChange,
  };
}
