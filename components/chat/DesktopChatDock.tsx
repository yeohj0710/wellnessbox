"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  ChevronDownIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ChatInput from "@/app/chat/components/ChatInput";
import ProfileBanner from "@/app/chat/components/ProfileBanner";
import useChat from "@/app/chat/hooks/useChat";

const MessageBubble = dynamic(() => import("@/app/chat/components/MessageBubble"));
const ProfileModal = dynamic(() => import("@/app/chat/components/ProfileModal"), {
  ssr: false,
});
const ReferenceData = dynamic(() => import("@/app/chat/components/ReferenceData"), {
  ssr: false,
});
const RecommendedProductActions = dynamic(
  () => import("@/app/chat/components/RecommendedProductActions"),
  { ssr: false }
);

function useIsDesktopWide(minWidth = 1280) {
  const [isDesktopWide, setIsDesktopWide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setIsDesktopWide(media.matches);
    onChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [minWidth]);

  return isDesktopWide;
}

export default function DesktopChatDock() {
  const pathname = usePathname();
  const isDesktopWide = useIsDesktopWide(1280);

  if (!isDesktopWide) return null;
  if (pathname?.startsWith("/chat")) return null;

  return <DesktopChatDockInner />;
}

function DesktopChatDockInner() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const {
    sessions,
    activeId,
    setActiveId,
    profile,
    showSettings,
    setShowSettings,
    showProfileBanner,
    setShowProfileBanner,
    profileLoaded,
    assessResult,
    checkAiResult,
    orders,
    suggestions,
    input,
    setInput,
    loading,
    sendMessage,
    stopStreaming,
    newChat,
    deleteChat,
    renameChat,
    messagesContainerRef,
    messagesEndRef,
    active,
    handleProfileChange,
    titleLoading,
    titleError,
    generateTitle,
  } = useChat({ manageFooter: false });

  useEffect(() => {
    if (!isOpen) {
      setSessionsOpen(false);
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, active?.messages.length, messagesEndRef]);

  const openDock = () => setIsOpen(true);
  const closeDock = () => setIsOpen(false);

  const handleRename = (sessionId: string, currentTitle: string) => {
    const nextTitle = window.prompt("대화 제목을 입력해 주세요.", currentTitle);
    if (typeof nextTitle !== "string") return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    renameChat(sessionId, trimmed);
  };

  const handleDelete = async (sessionId: string, title: string) => {
    const ok = window.confirm(`'${title}' 대화를 삭제할까요?`);
    if (!ok) return;
    await deleteChat(sessionId);
  };

  return (
    <div className="fixed bottom-5 right-6 z-20 hidden xl:block">
      <button
        type="button"
        onClick={openDock}
        className={`group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.2)] ${
          isOpen
            ? "pointer-events-none translate-y-2 scale-95 opacity-0"
            : "translate-y-0 scale-100 opacity-100"
        }`}
        aria-label="AI 상담 열기"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
          <SparklesIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-slate-800">AI 맞춤 상담</span>
        {loading ? (
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        )}
      </button>

      <aside
        className={`absolute bottom-0 right-0 flex h-[min(80vh,760px)] w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSessionsOpen((prev) => !prev)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="대화 목록"
              title="대화 목록"
            >
              {sessionsOpen ? (
                <XMarkIcon className="h-4 w-4" />
              ) : (
                <Bars3Icon className="h-4 w-4" />
              )}
            </button>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              <SparklesIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {active?.title || "AI 맞춤 상담"}
              </p>
              <p className="text-[11px] text-slate-500">
                웰니스 상담 도우미와 대화
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            {titleLoading && (
              <ArrowPathIcon
                className="h-4 w-4 animate-spin text-slate-500"
                aria-hidden
              />
            )}
            {titleError && (
              <button
                type="button"
                onClick={() => generateTitle()}
                className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                title="제목 다시 생성"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={newChat}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="새 상담"
              title="새 상담"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="설정"
              title="설정"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="채팅 전체 화면"
              title="전체 화면 열기"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={closeDock}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="채팅 접기"
              title="접기"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f8fafc_38%,_#ffffff_100%)]">
          <div
            className={`absolute inset-y-0 left-0 z-20 w-[250px] border-r border-slate-200 bg-white transition-transform duration-200 ${
              sessionsOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">대화 목록</p>
              <button
                type="button"
                onClick={() => setSessionsOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="목록 닫기"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-slate-200 p-2">
              <button
                type="button"
                onClick={() => {
                  newChat();
                  setSessionsOpen(false);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                + 새 상담 시작
              </button>
            </div>
            <ul className="max-h-[calc(100%-92px)] overflow-y-auto p-2">
              {sessions.map((session) => (
                <li key={session.id} className="mb-1 rounded-md border border-transparent hover:border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(session.id);
                      setSessionsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left ${
                      activeId === session.id ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="line-clamp-2 text-xs font-medium text-slate-800">
                      {session.title || "새 상담"}
                    </span>
                    {activeId === session.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    )}
                  </button>
                  <div className="mt-0.5 flex items-center justify-end gap-1 px-1 pb-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleRename(session.id, session.title || "새 상담")
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      title="이름 변경"
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(session.id, session.title || "새 상담")
                      }
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      title="삭제"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setSessionsOpen(false)}
            className={`absolute inset-0 z-10 bg-slate-900/20 transition-opacity duration-200 ${
              sessionsOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            aria-label="대화 목록 닫기"
          />

          <div
            className="h-full overflow-y-auto px-3 pb-4 pt-3"
            ref={messagesContainerRef}
          >
            {profileLoaded && !profile && (
              <ProfileBanner
                profile={profile}
                show={showProfileBanner}
                onEdit={() => setShowSettings(true)}
                onClose={() => setShowProfileBanner(false)}
              />
            )}

            <div className="space-y-3">
              {active &&
                active.messages.length > 0 &&
                active.messages.map((message, index) => (
                  <div key={message.id}>
                    {index === 0 && (
                      <ReferenceData
                        orders={orders}
                        assessResult={assessResult}
                        checkAiResult={checkAiResult}
                      />
                    )}
                    <MessageBubble role={message.role} content={message.content} />
                    {message.role === "assistant" && (
                      <RecommendedProductActions content={message.content} />
                    )}
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        <ChatInput
          mode="embedded"
          input={input}
          setInput={setInput}
          sendMessage={() => sendMessage()}
          loading={loading}
          suggestions={suggestions}
          onSelectSuggestion={(question) => sendMessage(question)}
          onStop={stopStreaming}
        />

        {showSettings && (
          <ProfileModal
            profile={profile}
            onClose={() => setShowSettings(false)}
            onChange={handleProfileChange}
          />
        )}
      </aside>
    </div>
  );
}
