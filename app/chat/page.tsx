"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import type { ChatMessage, ChatSession, UserProfile } from "@/types/chat";

const LS_SESSIONS_KEY = "wb_chat_sessions_v1";
const LS_PROFILE_KEY = "wb_user_profile_v1";
const LS_CLIENT_ID_KEY = "wb_client_id_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getClientIdLocal(): string {
  try {
    const existing = localStorage.getItem(LS_CLIENT_ID_KEY);
    if (existing) return existing;
    const id = uid();
    localStorage.setItem(LS_CLIENT_ID_KEY, id);
    return id;
  } catch {
    return uid();
  }
}

function getTzOffsetMinutes(): number {
  try {
    return -new Date().getTimezoneOffset();
  } catch {
    return 0;
  }
}

function loadSessions(): ChatSession[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY) || "[]";
    const arr = JSON.parse(raw) as ChatSession[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
}

function loadProfile(): UserProfile | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LS_PROFILE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return undefined;
  }
}

function saveProfile(p?: UserProfile) {
  if (typeof localStorage === "undefined") return;
  if (!p) return localStorage.removeItem(LS_PROFILE_KEY);
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(p));
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initStartedRef = useRef<Record<string, boolean>>({});
  function openDrawer() {
    setDrawerVisible(true);
    setTimeout(() => setDrawerOpen(true), 0);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 200);
  }
  async function typeText(sessionId: string, msgId: string, text: string) {
    for (let i = 1; i <= text.length; i++) {
      const slice = text.slice(0, i);
      setSessions((prev) =>
        prev.map((ss) =>
          ss.id === sessionId
            ? { ...ss, updatedAt: Date.now(), messages: ss.messages.map((m) => (m.id === msgId ? { ...m, content: slice } : m)) }
            : ss
        )
      );
      await new Promise((res) => setTimeout(res, 20));
    }
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, sessions, loading]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId]);

  function newChat() {
    const id = uid();
    const now = Date.now();
    const s: ChatSession = {
      id,
      title: "새 대화",
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
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: now };
    const asstMsg: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: now };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? { ...s, updatedAt: Date.now(), messages: [...s.messages, userMsg, asstMsg] }
          : s
      )
    );

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
        }),
      });
      if (!res.ok || !res.body) throw new Error("답변을 불러오지 못했습니다.");
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
                ? { ...s, updatedAt: Date.now(), messages: s.messages.map((m) => (m.id === asstMsg.id ? { ...m, content: textSoFar } : m)) }
                : s
            )
          );
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
          const title = typeof tJson?.title === "string" && tJson.title ? tJson.title : "새 대화";
          setSessions((prev) => prev.map((s) => (s.id === active.id ? { ...s, title } : s)));
        }
      } catch {}

      // Persist
      try {
        const tz = getTzOffsetMinutes();
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: cid,
            sessionId: active.id,
            title: sessions.find((s) => s.id === active.id)?.title || "새 대화",
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
            ? { ...s, updatedAt: Date.now(), messages: s.messages.map((m) => (m.id === asstMsg.id ? { ...m, content: `오류: ${errText}` } : m)) }
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
    const asstMsg: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: now };
    setSessions((prev) => prev.map((ss) => (ss.id === sessionId ? { ...ss, messages: [asstMsg] } : ss)));
    setLoading(true);
    try {
      const cid = getClientIdLocal();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], profile, clientId: cid, mode: "init" }),
      });
      if (!res.ok || !res.body) throw new Error("초기 메시지를 불러오지 못했습니다.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          fullText += decoder.decode(value);
        }
      }
      await typeText(sessionId, asstMsg.id, fullText);
      try {
        const tz = getTzOffsetMinutes();
        const cid = getClientIdLocal();
        await fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: cid, sessionId, messages: [{ ...asstMsg, content: fullText }], tzOffsetMinutes: tz }),
        });
      } catch {}
    } catch (e) {
      const errText = (e as Error).message || "문제가 발생했습니다.";
      setSessions((prev) =>
        prev.map((ss) =>
          ss.id === sessionId
            ? { ...ss, updatedAt: Date.now(), messages: ss.messages.map((m) => (m.role === "assistant" && m.content === "" ? { ...m, content: `오류: ${errText}` } : m)) }
            : ss
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-gradient-to-b from-slate-50 to-white">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 bg-white/70 backdrop-blur">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            대화 목록
          </div>
          <button className="p-2 rounded-md hover:bg-slate-100" onClick={newChat} title="새 대화">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">아직 대화 기록이 없어요.</div>
          ) : (
            <ul className="p-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-100 ${activeId === s.id ? "bg-slate-100" : ""}`}
                  onClick={() => setActiveId(s.id)}
                >
                  <span className="flex-1 truncate text-sm text-slate-800">{s.title || "새 대화"}</span>
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
        <div className="border-t border-slate-200 p-3">
          <button
            className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setShowSettings(true)}
          >
            <Cog6ToothIcon className="h-5 w-5" /> 상담 설정
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-2 text-slate-800">
            <button
              className="md:hidden rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={openDrawer}
            >
              대화 목록
            </button>
            <UserCircleIcon className="h-6 w-6" />
            <div className="font-medium">{active?.title || "웰니스박스 상담"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setShowSettings(true)}
            >
              설정
            </button>
            <button
              className="hidden md:inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
              onClick={newChat}
            >
              <PlusIcon className="h-4 w-4" /> 새 대화
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-40">
          {/* Disclaimer */}
          <div className="mx-auto max-w-3xl mb-4 text-xs text-slate-500">
            본 상담은 의사/약사의 전문적 조언을 대체하지 않습니다.
          </div>

          {/* Profile banner */}
          <div className="mx-auto max-w-3xl mb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center justify-between gap-3">
              <div>
                {profile ? (
                  <span>
                    프로필 {profile.age ? `${profile.age}세` : "나이 미입력"} · {profile.sex || "성별 미입력"} · 목표 {profile.goals?.join(", ") || "미입력"}
                  </span>
                ) : (
                  <span>맞춤 상담을 위해 개인 프로필을 설정해주세요.</span>
                )}
              </div>
              <button className="flex-none rounded-md border border-amber-300 bg-white/70 px-2 py-1 hover:bg-white whitespace-nowrap break-keep" onClick={() => setShowSettings(true)}>
                설정하기
              </button>
            </div>
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

        {/* Input (sticky) */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 px-4 py-4">
              <textarea
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 max-h-40 min-h-[48px]"
                placeholder="궁금한 점을 입력하고 엔터로 전송"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
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

      {/* Drawer (mobile) */}
      {drawerVisible && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" onClick={closeDrawer}>
          <div className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`} />
          <div className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl border-r border-slate-200 transform transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-semibold"><ChatBubbleLeftRightIcon className="h-6 w-6" /> 대화 목록</div>
              <button className="p-2 rounded-md hover:bg-slate-100" onClick={closeDrawer}>닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="p-2">
                {sessions.map((s) => (
                  <li key={s.id} className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-100 ${activeId === s.id ? "bg-slate-100" : ""}`} onClick={() => { setActiveId(s.id); closeDrawer(); }}>
                    <span className="flex-1 truncate text-sm text-slate-800">{s.title || "새 대화"}</span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteChat(s.id); }} title="삭제">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-200 p-3">
              <button className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => { newChat(); closeDrawer(); }}>
                <PlusIcon className="h-4 w-4" /> 새 대화
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <ProfileModal profile={profile} onClose={() => setShowSettings(false)} onChange={(p) => setProfile(p)} />
      )}
    </div>
  );
}

function MessageBubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${isUser ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
        {content ? (
          content
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-black animate-[wb-breathe_1.1s_ease-in-out_infinite]" />
            작성 중...
          </span>
        )}
      </div>
      <style jsx global>{`
        @keyframes wb-breathe { 0% { transform: scale(0.85); opacity: .7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.85); opacity: .7; } }
      `}</style>
    </div>
  );
}

function EmptyState({ onTryExamples }: { onTryExamples: (q: string) => void }) {
  const examples = [
    "면역 보강에는 어떤 카테고리가 좋을까요?",
    "위장 부담 줄이려면 비타민C는 어떻게 먹어요?",
    "카페인 민감한데 마그네슘-3 복용법 알려줘요",
    "운동 후 회복에 맞는 보충제 추천해 주세요",
  ];
  return (
    <div className="text-center text-slate-600">
      <h2 className="text-xl font-semibold mb-2">웰니스박스 보충제 상담을 시작해 보세요</h2>
      <p className="text-sm mb-4">프로필을 설정하면 더 정밀한 맞춤 추천이 가능해요</p>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex, i) => (
          <button
            key={i}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            onClick={() => onTryExamples(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileModal({ profile, onClose, onChange }: { profile?: UserProfile; onClose: () => void; onChange: (p?: UserProfile) => void }) {
  const [local, setLocal] = useState<UserProfile>({ ...(profile || {}) });
  useEffect(() => { setLocal({ ...(profile || {}) }); }, [profile]);
  function set<K extends keyof UserProfile>(k: K, v: UserProfile[K]) { setLocal((p) => ({ ...(p || {}), [k]: v })); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="font-semibold text-slate-800">상담 설정</div>
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>닫기</button>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput label="이름" placeholder="홍길동" value={local.name || ""} onChange={(v) => set("name", v)} />
          <LabeledInput label="나이" type="number" placeholder="34" value={local.age?.toString() || ""} onChange={(v) => set("age", v ? Number(v) : undefined)} />
          <LabeledSelect label="성별" value={local.sex || ""} onChange={(v) => set("sex", v as any)} options={[{ label: "선택 안함", value: "" }, { label: "남성", value: "male" }, { label: "여성", value: "female" }, { label: "기타", value: "other" }]} />
          <LabeledInput label="키(cm)" type="number" placeholder="170" value={local.heightCm?.toString() || ""} onChange={(v) => set("heightCm", v ? Number(v) : undefined)} />
          <LabeledInput label="체중(kg)" type="number" placeholder="65" value={local.weightKg?.toString() || ""} onChange={(v) => set("weightKg", v ? Number(v) : undefined)} />
          <LabeledChips label="복용 중 약" placeholder="예: 메트포르민" values={local.medications || []} onChange={(vals) => set("medications", vals)} />
          <LabeledChips label="질환/증상" placeholder="예: 고혈압, 위염" values={local.conditions || []} onChange={(vals) => set("conditions", vals)} />
          <LabeledChips label="알레르기" placeholder="예: 갑각류" values={local.allergies || []} onChange={(vals) => set("allergies", vals)} />
          <LabeledChips label="목표" placeholder="예: 수면, 스트레스" values={local.goals || []} onChange={(vals) => set("goals", vals)} />
          <LabeledChips label="식이 제한" placeholder="예: 비건, 할랄" values={local.dietaryRestrictions || []} onChange={(vals) => set("dietaryRestrictions", vals)} />
          <LabeledSelect label="임신/수유" value={local.pregnantOrBreastfeeding ? "yes" : local.pregnantOrBreastfeeding === false ? "no" : ""} onChange={(v) => set("pregnantOrBreastfeeding", v === "yes" ? true : v === "no" ? false : undefined)} options={[{ label: "선택 안함", value: "" }, { label: "예", value: "yes" }, { label: "아니오", value: "no" }]} />
          <LabeledSelect label="카페인 민감" value={local.caffeineSensitivity ? "yes" : local.caffeineSensitivity === false ? "no" : ""} onChange={(v) => set("caffeineSensitivity", v === "yes" ? true : v === "no" ? false : undefined)} options={[{ label: "선택 안함", value: "" }, { label: "예", value: "yes" }, { label: "아니오", value: "no" }]} />
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button className="text-sm text-red-600 hover:text-red-700" onClick={() => onChange(undefined)}>프로필 초기화</button>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={onClose}>취소</button>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800" onClick={() => { onChange(local); onClose(); }}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function LabeledChips({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (vals: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  function addChip() {
    const v = text.trim(); if (!v) return; onChange([...(values || []), v]); setText("");
  }
  return (
    <div className="text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {(values || []).map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {v}
            <button className="text-slate-500 hover:text-slate-800" onClick={() => onChange(values.filter((_, idx) => idx !== i))}>×</button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(); } }}
        />
        <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100" onClick={addChip}>추가</button>
      </div>
    </div>
  );
}
