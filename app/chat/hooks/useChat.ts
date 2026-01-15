"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";
import {
  uid,
  getClientIdLocal,
  getTzOffsetMinutes,
  loadSessions,
  saveSessions,
  loadProfileLocal,
  saveProfileLocal,
  loadProfileServer,
  saveProfileServer,
  formatAssessCat,
} from "../utils";

export default function useChat() {
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
  const profileInitRef = useRef(true);
  const savedKeysRef = useRef<Set<string>>(new Set());
  const readyToPersistRef = useRef<Record<string, boolean>>({});
  const actorAppUserIdRef = useRef<string | null>(null);
  const actorLoggedInRef = useRef(false);

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
      sorted.forEach((s) => (readyToPersistRef.current[s.id] = true));
    } else {
      const id = uid();
      const now = Date.now();
      const ns: ChatSession = {
        id,
        title: "새 상담",
        createdAt: now,
        updatedAt: now,
        appUserId: actorLoggedInRef.current ? actorAppUserIdRef.current : null,
        messages: [],
      };
      setSessions([ns]);
      setActiveId(id);
      readyToPersistRef.current[id] = false;
    }
    (async () => {
      try {
        const res = await fetch("/api/chat/save", { method: "GET" });
        if (!res.ok) return;
        const js = await res.json().catch(() => ({}));
        if (js?.actor) {
          actorLoggedInRef.current = !!js.actor.loggedIn;
          actorAppUserIdRef.current = js.actor.appUserId ?? null;
        }
        if (!Array.isArray(js?.sessions)) return;
        setSessions((prev) => {
          const merged = new Map<string, ChatSession>();
          const ensureReady: Record<string, boolean> = {};
          for (const s of prev) {
            merged.set(s.id, s);
            ensureReady[s.id] = readyToPersistRef.current[s.id] ?? true;
          }
          for (const raw of js.sessions as any[]) {
            if (!raw?.id) continue;
            const normalized: ChatSession = {
              id: String(raw.id),
              title: raw.title || "새 상담",
              createdAt: raw.createdAt ? Number(raw.createdAt) : Date.now(),
              updatedAt: raw.updatedAt ? Number(raw.updatedAt) : Date.now(),
              appUserId: raw.appUserId ?? null,
              messages: Array.isArray(raw.messages)
                ? raw.messages.map((m: any) => ({
                    id: String(m.id),
                    role: m.role,
                    content: m.content ?? "",
                    createdAt: m.createdAt ? Number(m.createdAt) : Date.now(),
                  }))
                : [],
            };
            const existing = merged.get(normalized.id);
            if (
              !existing ||
              (existing.updatedAt || 0) < (normalized.updatedAt || 0)
            ) {
              merged.set(normalized.id, normalized);
            }
            ensureReady[normalized.id] = true;
          }

          if (actorLoggedInRef.current && actorAppUserIdRef.current) {
            for (const [id, session] of merged.entries()) {
              if (
                !session.appUserId &&
                session.messages.length === 0 &&
                !readyToPersistRef.current[id]
              ) {
                merged.set(id, {
                  ...session,
                  appUserId: actorAppUserIdRef.current,
                });
              }
            }
          }

          if (actorLoggedInRef.current) {
            const me = actorAppUserIdRef.current;
            for (const [id, session] of merged.entries()) {
              if (session.appUserId && session.appUserId !== me) {
                merged.delete(id);
                delete ensureReady[id];
              }
            }
          } else {
            for (const [id, session] of merged.entries()) {
              if (session.appUserId) {
                merged.delete(id);
                delete ensureReady[id];
              }
            }
          }

          readyToPersistRef.current = ensureReady;
          let arr = Array.from(merged.values()).sort(
            (a, b) =>
              (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
          );

          if (arr.length > 1) {
            arr = arr.filter(
              (s) => s.messages.length > 0 || readyToPersistRef.current[s.id]
            );
          }
          const nextActiveId =
            (activeIdRef.current && merged.has(activeIdRef.current)
              ? activeIdRef.current
              : arr[0]?.id) || null;
          setActiveId(nextActiveId);
          return arr;
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
    if (!sessions.length) return;
    const persistable = sessions.filter((s) => {
      const first = s.messages[0];
      if (first && first.role === "assistant")
        return !!readyToPersistRef.current[s.id];
      return true;
    });
    saveSessions(persistable);
  }, [sessions]);

  const { hideFooter, showFooter } = useFooter();
  useEffect(() => {
    hideFooter();
    return () => showFooter();
  }, [hideFooter, showFooter]);

  useEffect(() => {
    try {
      const raw =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("wb_check_ai_result_v1")
          : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed?.topLabels)
        ? parsed.topLabels.slice(0, 3)
        : [];
      if (arr.length) setLocalCheckAi(arr);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("assess-state")
          : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed?.cResult?.catsOrdered)
        ? parsed.cResult.catsOrdered.slice(0, 3)
        : [];
      if (arr.length) setLocalAssessCats(arr);
    } catch {}
  }, []);

  useEffect(() => {
    fetch(`/api/user/all-results`)
      .then((r) => r.json())
      .then((data) => {
        const assess = data?.assess;
        const assessNormalized = assess?.normalized;
        if (Array.isArray(assessNormalized?.topLabels)) {
          const cats = assessNormalized.topLabels;
          const pcts = Array.isArray(assessNormalized?.scores)
            ? assessNormalized.scores.map((score: any) =>
                typeof score?.value === "number" ? score.value : 0
              )
            : [];
          const summary = cats.map(
            (c: string, i: number) =>
              `${formatAssessCat(c)} ${(pcts[i] * 100).toFixed(1)}%`
          );
          const answers = Array.isArray(assess.answersDetailed)
            ? assess.answersDetailed.map((a: any) => ({
                question: a.question,
                answer: a.answerLabel,
              }))
            : [];
          setAssessResult({
            createdAt: assess.createdAt,
            summary,
            answers,
          });
        } else {
          setAssessResult(null);
        }

        const checkAi = data?.checkAi;
        const checkAiNormalized = checkAi?.normalized;
        if (Array.isArray(checkAiNormalized?.topLabels)) {
          const labels = checkAiNormalized.topLabels.slice(0, 3);
          const answers = Array.isArray(checkAi?.answersDetailed)
            ? checkAi.answersDetailed.map((a: any) => ({
                question: a.question,
                answer: a.answerLabel,
              }))
            : [];
          setCheckAiResult({
            createdAt: checkAi.createdAt,
            labels,
            answers,
          });
        } else {
          setCheckAiResult(null);
        }

        const ords = Array.isArray(data?.orders)
          ? data.orders.map((o: any) => ({
              id: o.id,
              status: o.status,
              updatedAt: o.updatedAt,
              items: (o.orderItems || []).map((it: any) => ({
                name: it.pharmacyProduct?.product?.name || "상품",
                quantity: it.quantity,
              })),
            }))
          : [];
        setOrders(ords);
      })
      .catch(() => {})
      .finally(() => setResultsLoaded(true));
  }, []);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) || null,
    [sessions, activeId]
  );
  const prevActiveIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const msgLen = active.messages.length;
    if (prevActiveIdRef.current !== activeId) {
      requestAnimationFrame(() => {
        scrollToTop();
      });
      prevActiveIdRef.current = activeId;
      prevMsgCountRef.current = msgLen;
      return;
    }
    if (msgLen > prevMsgCountRef.current) {
      requestAnimationFrame(() => {
        if (stickToBottomRef.current) scrollToBottom();
      });
      prevMsgCountRef.current = msgLen;
    }
  }, [activeId, active?.messages.length]);

  useEffect(() => {
    if (!resultsLoaded || !profileLoaded) return;
    if (!activeId) return;
    const s = sessions.find((x) => x.id === activeId);
    if (!s || s.messages.length > 0) return;
    startInitialAssistantMessage(activeId);
  }, [resultsLoaded, profileLoaded, activeId, sessions]);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const onScroll = () => {
      stickToBottomRef.current = isAtBottom();
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [messagesContainerRef.current]);

  function scrollToBottom() {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }

  function scrollToTop() {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = 0;
  }

  function isAtBottom(threshold = 80) {
    const c = messagesContainerRef.current;
    if (!c) return false;
    return c.scrollHeight - c.scrollTop - c.clientHeight <= threshold;
  }

  function newChat() {
    const id = uid();
    const now = Date.now();
    const s: ChatSession = {
      id,
      title: "새 상담",
      createdAt: now,
      updatedAt: now,
      appUserId: actorLoggedInRef.current ? actorAppUserIdRef.current : null,
      messages: [],
    };
    const next = [s, ...sessions];
    setSessions(next);
    setActiveId(id);
    setSuggestions([]);
    firstUserMessageRef.current = "";
    firstAssistantMessageRef.current = "";
    firstAssistantReplyRef.current = "";
    setTitleLoading(false);
    setTitleError(false);
    readyToPersistRef.current[id] = false;
  }

  function deleteChat(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  function renameChat(id: string, title: string) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function normalizeNewlines(text: string) {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([^\n])\n([ \t]*([-*+]\s|\d+\.\s))/g, "$1\n\n$2");
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
    const key = `${sessionId}:${messages.map((m) => m.id).join(",")}`;
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
    )
      return;
    setTitleLoading(true);
    setTitleError(false);
    try {
      const tRes = await fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstUserMessage: firstUserMessageRef.current,
          firstAssistantMessage: firstAssistantMessageRef.current,
          assistantReply: firstAssistantReplyRef.current,
        }),
      });
      const tJson = await tRes.json().catch(() => ({}));
      const title =
        typeof tJson?.title === "string" && tJson.title
          ? tJson.title
          : "새 상담";
      setSessions((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, title } : s))
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

  async function fetchSuggestions(lastAssistantText: string, count = 2) {
    try {
      const res = await fetch("/api/chat/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lastAssistantText,
          profile,
          assessResult,
          checkAiResult,
          orders,
          recentMessages: active?.messages ?? [],
          count, // ★ 추가: 요청 개수(최초 2개, 이후 1개)
        }),
      });
      const js = await res.json().catch(() => ({}));
      if (Array.isArray(js?.suggestions)) setSuggestions(js.suggestions);
    } catch {}
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
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: normalizeNewlines(text),
      createdAt: now,
    };
    const asstMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, userMsg, asstMsg],
            }
          : s
      )
    );
    stickToBottomRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const cid = getClientIdLocal();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: (active.messages || []).concat(userMsg),
          profile,
          clientId: cid,
          mode: "chat",
          localCheckAiTopLabels: localCheckAi,
          localAssessCats,
          orders: orders.map((o) => ({
            id: o.id,
            status: o.status,
            items: o.items.map(
              (it: any) => `${it.name}${it.quantity ? ` x${it.quantity}` : ""}`
            ),
          })),
          assessResult: assessResult || null,
          checkAiResult: checkAiResult || null,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("대화를 이어받지 못했어요.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value);
          fullText += chunk;
          const textSoFar = normalizeNewlines(fullText);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === active.id
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((m) =>
                      m.id === asstMsg.id ? { ...m, content: textSoFar } : m
                    ),
                  }
                : s
            )
          );
        }
      }

      if (isFirst) {
        firstAssistantReplyRef.current = fullText;
        await generateTitle();
        await fetchSuggestions(fullText, 1);
      } else {
        await fetchSuggestions(fullText, 1);
      }

      try {
        const tz = getTzOffsetMinutes();
        await saveChatOnce({
          clientId: cid,
          sessionId: active.id,
          title: sessions.find((s) => s.id === active.id)?.title || "새 상담",
          messages: [userMsg, { ...asstMsg, content: fullText }],
          tzOffsetMinutes: tz,
        });
      } catch {}
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        const errText = (e as Error).message || "문제가 발생했어요.";
        setSessions((prev) =>
          prev.map((s) =>
            s.id === active.id
              ? {
                  ...s,
                  updatedAt: Date.now(),
                  messages: s.messages.map((m) =>
                    m.id === asstMsg.id
                      ? { ...m, content: `오류: ${errText}` }
                      : m
                  ),
                }
              : s
          )
        );
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
    const s = sessions.find((x) => x.id === sessionId);
    if (!s || s.messages.length > 0) return;
    const now = Date.now();
    const asstMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: now,
    };
    setSessions((prev) =>
      prev.map((ss) =>
        ss.id === sessionId ? { ...ss, messages: [asstMsg] } : ss
      )
    );
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const cid = getClientIdLocal();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          profile,
          clientId: cid,
          mode: "init",
          localCheckAiTopLabels: localCheckAi,
          localAssessCats,
          orders: orders.map((o) => ({
            id: o.id,
            status: o.status,
            items: o.items.map(
              (it: any) => `${it.name}${it.quantity ? ` x${it.quantity}` : ""}`
            ),
          })),
          assessResult: assessResult || null,
          checkAiResult: checkAiResult || null,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body)
        throw new Error("초기 메시지를 받아오지 못했어요.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value);
          fullText += chunk;
          const textSoFar = normalizeNewlines(fullText);
          setSessions((prev) =>
            prev.map((ss) =>
              ss.id === sessionId
                ? {
                    ...ss,
                    updatedAt: Date.now(),
                    messages: ss.messages.map((m) =>
                      m.id === asstMsg.id ? { ...m, content: textSoFar } : m
                    ),
                  }
                : ss
            )
          );
        }
      }

      fetchSuggestions(fullText, 2).catch(() => {});
      firstAssistantMessageRef.current = fullText;

      try {
        const tz = getTzOffsetMinutes();
        const cid2 = getClientIdLocal();
        await saveChatOnce({
          clientId: cid2,
          sessionId,
          messages: [{ ...asstMsg, content: fullText }],
          tzOffsetMinutes: tz,
        });
        readyToPersistRef.current[sessionId] = true;
        setSessions((prev) => prev.slice());
      } catch {}
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        const errText = (e as Error).message || "문제가 발생했어요.";
        setSessions((prev) =>
          prev.map((ss) =>
            ss.id === sessionId
              ? {
                  ...ss,
                  updatedAt: Date.now(),
                  messages: ss.messages.map((m) =>
                    m.role === "assistant" && m.content === ""
                      ? { ...m, content: `오류: ${errText}` }
                      : m
                  ),
                }
              : ss
          )
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleProfileChange(p?: UserProfile) {
    if (!p) {
      setProfile(undefined);
      saveProfileLocal(undefined as any);
      saveProfileServer(undefined as any);
      return;
    }
    if (typeof p === "object" && Object.keys(p).length === 0) return;
    setProfile(p);
    saveProfileLocal(p);
    saveProfileServer(p);
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
