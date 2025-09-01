"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFooter } from "@/components/common/footerContext";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  PaperAirplaneIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";
import MessageBubble from "./components/MessageBubble";
import EmptyState from "./components/EmptyState";
import ProfileModal from "./components/ProfileModal";
import {
  uid,
  getClientIdLocal,
  getTzOffsetMinutes,
  loadSessions,
  saveSessions,
  loadProfile,
  saveProfile,
} from "./utils";

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(false);
  const initStartedRef = useRef<Record<string, boolean>>({});

  function openDrawer() {
    setDrawerVisible(true);
    setTimeout(() => setDrawerOpen(true), 0);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 200);
  }

  function scrollToBottom() {
    if (!autoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }

  useEffect(() => {
    const s = loadSessions();
    setSessions(s);
    setProfile(loadProfile());
    // Always start a new chat on entry
    setTimeout(() => newChat(), 0);
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    autoScrollRef.current = false;
    const onScroll = () => {
      const doc = document.documentElement;
      autoScrollRef.current =
        doc.scrollHeight - (window.innerHeight + window.scrollY) < 40;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { hideFooter, showFooter } = useFooter();
  useEffect(() => {
    hideFooter();
    return () => showFooter();
  }, [hideFooter, showFooter]);

  // Load local Check-AI top labels for personalization
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
        setAssessResult(data?.assess ?? null);
        setCheckAiResult(data?.checkAi ?? null);
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      })
      .catch(() => {});
  }, []);

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) || null,
    [sessions, activeId]
  );

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
    setTimeout(() => startInitialAssistantMessage(id), 0);
  }

  function deleteChat(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  async function sendMessage(overrideText?: string) {
    if (!active) return;
    const text = (overrideText ?? input).trim();
    if (!text) return;
    setInput("");

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
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
        }),
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
          const textSoFar = fullText;
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

      // Title from first user message
      try {
        if ((active.messages?.length ?? 0) === 0) {
          const tRes = await fetch("/api/chat/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstUserMessage: text }),
          });
          const tJson = await tRes.json().catch(() => ({}));
          const title =
            typeof tJson?.title === "string" && tJson.title
              ? tJson.title
              : "새 상담";
          setSessions((prev) =>
            prev.map((s) => (s.id === active.id ? { ...s, title } : s))
          );
        }
      } catch {}

      // Persist conversation chunk
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
    } finally {
      setLoading(false);
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
        }),
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
          const textSoFar = fullText;
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col w-full min-h-[calc(100vh-56px)] bg-gradient-to-b from-slate-50 to-white">
      <main className="flex-1 flex flex-col">
        <button
          className="fixed top-16 left-4 z-50 p-2 rounded-lg text-slate-700 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition"
          onClick={openDrawer}
          aria-label="Open menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="mx-auto max-w-3xl w-full px-4 md:px-8 flex-1 pt-8 pb-28">
          <div className="mx-auto max-w-3xl mb-8" hidden={!showProfileBanner}>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-sm">
              <div className="px-1 flex-1 leading-tight">
                {profile ? (
                  <span>
                    프로필 설정됨 · 나이 {profile.age ?? "?"}, 성별{" "}
                    {profile.sex ?? "?"}
                    {profile.goals?.length
                      ? ` · 목표 ${profile.goals.join(", ")}`
                      : ""}
                  </span>
                ) : (
                  <span>
                    프로필을 설정하면 나에게 좀 더 개인맞춤화된 상담이 쉬워져요.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 hover:bg-amber-100 whitespace-nowrap transition"
                  onClick={() => setShowSettings(true)}
                >
                  프로필 설정
                </button>
                <button
                  aria-label="Close profile banner"
                  className="h-6 w-6 p-0 text-amber-700 hover:text-amber-900 hover:opacity-80 transition"
                  onClick={() => setShowProfileBanner(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
          </div>
        </div>

          <div className="mx-auto max-w-3xl mb-8">
            {orders.length > 0 && (
              <div className="mb-4">
                <h2 className="font-semibold">Orders</h2>
                {orders.map((o) => (
                  <div key={o.id} className="text-xs">
                    <div className="text-gray-500">
                      최근 상태 변경: {new Date(o.updatedAt).toLocaleString()}
                    </div>
                    <div>
                      주문 #{o.id} - {o.status}
                    </div>
                    {o.orderItems?.length > 0 && (
                      <ul className="list-disc pl-4 mt-1">
                        {o.orderItems.map((item: any) => (
                          <li key={item.id}>
                            {item.pharmacyProduct?.product?.name || "상품"}
                            {item.quantity ? ` x${item.quantity}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
            {assessResult && (
              <div className="mb-4">
                <h2 className="font-semibold">Assessment Result</h2>
                <div className="text-xs">
                  <div className="text-gray-500">
                    검사일시: {new Date(assessResult.createdAt).toLocaleString()}
                  </div>
                  {assessResult.answers && (
                    <pre className="whitespace-pre-wrap mt-1">
                      {JSON.stringify(assessResult.answers)}
                    </pre>
                  )}
                  <pre className="whitespace-pre-wrap mt-1">
                    {JSON.stringify(assessResult.cResult)}
                  </pre>
                </div>
              </div>
            )}
            {checkAiResult && (
              <div>
                <h2 className="font-semibold">Check-AI Result</h2>
                <div className="text-xs">
                  <div className="text-gray-500">
                    검사일시: {new Date(checkAiResult.createdAt).toLocaleString()}
                  </div>
                  {checkAiResult.answers && (
                    <pre className="whitespace-pre-wrap mt-1">
                      {JSON.stringify(checkAiResult.answers)}
                    </pre>
                  )}
                  {checkAiResult.result?.answers && (
                    <pre className="whitespace-pre-wrap mt-1">
                      {JSON.stringify(checkAiResult.result.answers)}
                    </pre>
                  )}
                  <pre className="whitespace-pre-wrap mt-1">
                    {JSON.stringify(checkAiResult.result)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {!active || active.messages.length === 0 ? (
              <EmptyState onTryExamples={(q) => sendMessage(q)} />
            ) : (
              active.messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full px-4 pointer-events-none">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 pointer-events-auto">
              <textarea
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-300 max-h-40 min-h-[48px]"
                placeholder="궁금한 내용을 입력하고 Enter로 전송"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                title="전송"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {drawerVisible && (
        <div
          className="fixed left-0 right-0 bottom-0 top-14 z-50"
          role="dialog"
          aria-modal="true"
          onClick={closeDrawer}
        >
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl border-r border-slate-200 transform transition-transform duration-200 ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <ChatBubbleLeftRightIcon className="h-6 w-6" /> 대화 기록
              </div>
              <button
                className="p-2 rounded-md hover:bg-slate-100"
                onClick={closeDrawer}
              >
                닫기
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  아직 대화 기록이 없습니다.
                </div>
              ) : (
                <ul className="p-2">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-100 ${
                        activeId === s.id ? "bg-slate-100" : ""
                      }`}
                      onClick={() => {
                        setActiveId(s.id);
                        closeDrawer();
                      }}
                    >
                      <span className="flex-1 truncate text-sm text-slate-800">
                        {s.title || "새 상담"}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(s.id);
                        }}
                        title="삭제"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-200 p-3 space-y-2">
              <button
                className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  newChat();
                  closeDrawer();
                }}
              >
                <PlusIcon className="h-4 w-4" /> 새 상담 시작
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => setShowSettings(true)}
              >
                <Cog6ToothIcon className="h-5 w-5" /> 프로필 설정
              </button>
            </div>
          </div>
        </div>
      )}

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
