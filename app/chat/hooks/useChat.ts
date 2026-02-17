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

type UseChatOptions = {
  manageFooter?: boolean;
};

export default function useChat(options: UseChatOptions = {}) {
  const manageFooter = options.manageFooter ?? true;
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

  function openDrawer() {
    setDrawerVisible(true);
    setTimeout(() => setDrawerOpen(true), 0);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 200);
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
      const remote = await loadProfileServer();
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
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    setSuggestions([]);
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
    fetch(`/api/user/all-results`)
      .then((response) => response.json())
      .then((data) => {
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
      .finally(() => setResultsLoaded(true));
  }, []);

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
    if (!resultsLoaded || !profileLoaded) return;
    if (!activeId) return;

    const session = sessions.find((item) => item.id === activeId);
    if (!session || session.messages.length > 0) return;

    startInitialAssistantMessage(activeId);
  }, [resultsLoaded, profileLoaded, activeId, sessions]);

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

  async function sendMessage(overrideText?: string) {
    if (loading) return;
    if (!active) return;

    const text = (overrideText ?? input).trim();
    if (!text) return;

    const isFirst = active.messages.length === 1;
    setInput("");
    setSuggestions([]);
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

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
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
          sanitizeAssistantText(textSoFar)
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
      await fetchSuggestions(fullText, active.id);

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
          sanitizeAssistantText(textSoFar)
        );
      });

      const finalizedText = sanitizeAssistantText(fullText, true);
      if (finalizedText !== fullText) {
        fullText = finalizedText;
      }

      updateAssistantMessage(sessionId, assistantMessage.id, fullText);
      fetchSuggestions(fullText, sessionId).catch(() => {});
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
    generateTitle,
    active,
    handleProfileChange,
  };
}
