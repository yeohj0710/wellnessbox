"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";
import MessageBubble from "./components/MessageBubble";
import ProfileModal from "./components/ProfileModal";
import ChatDrawer from "./components/ChatDrawer";
import ChatInput from "./components/ChatInput";
import ProfileBanner from "./components/ProfileBanner";
import ReferenceData from "./components/ReferenceData";
import ChatTopBar from "./components/ChatTopBar";
import {
  uid,
  getClientIdLocal,
  getTzOffsetMinutes,
  loadSessions,
  saveSessions,
  loadProfile,
  saveProfile,
} from "./utils";
import { CODE_TO_LABEL } from "@/lib/categories";

function formatAssessCat(code: string) {
  return CODE_TO_LABEL[code] || code;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const initStartedRef = useRef<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  function openDrawer() {
    setDrawerVisible(true);
    setTimeout(() => setDrawerOpen(true), 0);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 200);
  }

  function scrollToBottom() {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }

  useEffect(() => {
    const existing = loadSessions();
    const id = uid();
    const now = Date.now();
    const ns: ChatSession = {
      id,
      title: "새 상담",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setSessions([ns, ...existing]);
    setActiveId(id);
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const { hideFooter, showFooter } = useFooter();
  useEffect(() => {
    hideFooter();
    return () => showFooter();
  }, [hideFooter, showFooter]);

  useEffect(() => {
    scrollToBottom();
  }, [activeId]);

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

  // Load local assessment categories if any
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

  // Load all assessment and Check-AI results for this client from server
  useEffect(() => {
    const cid = getClientIdLocal();
    fetch(`/api/user/all-results?clientId=${cid}`)
      .then((r) => r.json())
      .then((data) => {
        const assess = data?.assess;
        if (assess?.cResult?.catsOrdered) {
          const cats = assess.cResult.catsOrdered;
          const pcts = assess.cResult.percents || [];
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
        if (Array.isArray(checkAi?.result?.topLabels)) {
          const labels = checkAi.result.topLabels.slice(0, 3);
          const answers = Array.isArray(checkAi.answersDetailed)
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

  useEffect(() => {
    if (!resultsLoaded) return;
    if (!activeId) return;
    const s = sessions.find((x) => x.id === activeId);
    if (!s || s.messages.length > 0) return;
    startInitialAssistantMessage(activeId);
  }, [resultsLoaded, activeId, sessions]);

  function newChat() {
    const id = uid();
    const now = Date.now();
    const s: ChatSession = {
      id,
      title: "새 상담",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    const next = [s, ...sessions];
    setSessions(next);
    setActiveId(id);
    setSuggestions([]);
    firstUserMessageRef.current = "";
    firstAssistantMessageRef.current = "";
    setTitleLoading(false);
    setTitleError(false);
  }

  function deleteChat(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function normalizeNewlines(text: string) {
    return text.replace(/\n{3,}/g, "\n\n\n");
  }

  async function generateTitle() {
    if (
      !firstUserMessageRef.current ||
      !firstAssistantMessageRef.current ||
      !activeId
    ) {
      return;
    }
    setTitleLoading(true);
    setTitleError(false);
    try {
      const tRes = await fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstUserMessage: firstUserMessageRef.current,
          firstAssistantMessage: firstAssistantMessageRef.current,
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
    } catch (e) {
      setTitleError(true);
    } finally {
      setTitleLoading(false);
    }
  }

  async function fetchSuggestions(firstAssistant: string) {
    try {
      const res = await fetch("/api/chat/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: firstAssistant }),
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
    scrollToBottom();

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
      if (!res.ok || !res.body) throw new Error("대화를 이어받지 못했습니다.");
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
          scrollToBottom();
        }
      }
      if (isFirst) {
        firstAssistantMessageRef.current = fullText;
        await generateTitle();
      }
      try {
        const tz = getTzOffsetMinutes();
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: cid,
            sessionId: active.id,
            title: sessions.find((s) => s.id === active.id)?.title || "새 상담",
            messages: [userMsg, { ...asstMsg, content: fullText }],
            tzOffsetMinutes: tz,
          }),
        });
      } catch {}
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        const errText = (e as Error).message || "문제가 발생했습니다.";
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
    scrollToBottom();
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
        throw new Error("초기 메시지를 받아오지 못했습니다.");
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
          scrollToBottom();
        }
      }
      await fetchSuggestions(fullText);
      try {
        const tz = getTzOffsetMinutes();
        const cid2 = getClientIdLocal();
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: cid2,
            sessionId,
            messages: [{ ...asstMsg, content: fullText }],
            tzOffsetMinutes: tz,
          }),
        });
      } catch {}
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        const errText = (e as Error).message || "문제가 발생했습니다.";
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

  return (
    <div className="relative flex flex-col w-full min-h-[calc(100vh-56px)] bg-gradient-to-b from-slate-50 to-white">
      <div className="fixed top-14 left-0 right-0 z-10">
        <div className="mx-auto max-w-3xl w-full">
          <ChatTopBar
            openDrawer={openDrawer}
            newChat={newChat}
            openSettings={() => setShowSettings(true)}
            title={active?.title || "새 상담"}
            titleLoading={titleLoading}
            titleError={titleError}
            retryTitle={() => generateTitle()}
            highlight={topTitleHighlight}
          />
        </div>
      </div>
      <div className="h-12" />
      <main className="flex-1 flex flex-col">
        <div
          className="mx-auto max-w-3xl w-full px-5 sm:px-6 md:px-8 flex-1 pt-4 pb-56 overflow-y-auto"
          ref={messagesContainerRef}
        >
          {!profile && (
            <ProfileBanner
              profile={profile}
              show={showProfileBanner}
              onEdit={() => setShowSettings(true)}
              onClose={() => setShowProfileBanner(false)}
            />
          )}
          <div className="mx-auto max-w-3xl space-y-4">
            {active &&
              active.messages.length > 0 &&
              active.messages.map((m, i) => (
                <div key={m.id}>
                  {i === 0 && (
                    <ReferenceData
                      orders={orders}
                      assessResult={assessResult}
                      checkAiResult={checkAiResult}
                    />
                  )}
                  <MessageBubble role={m.role} content={m.content} />
                </div>
              ))}
          </div>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={() => sendMessage()}
          loading={loading}
          suggestions={
            active && active.messages.length === 1 ? suggestions : []
          }
          onSelectSuggestion={(q) => sendMessage(q)}
          onStop={stopStreaming}
        />
      </main>

      <ChatDrawer
        sessions={sessions}
        activeId={activeId}
        setActiveId={setActiveId}
        deleteChat={deleteChat}
        newChat={newChat}
        drawerVisible={drawerVisible}
        drawerOpen={drawerOpen}
        closeDrawer={closeDrawer}
        highlightId={titleHighlightId}
      />

      {showSettings && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onChange={(p) => setProfile(p)}
        />
      )}
    </div>
  );
}
