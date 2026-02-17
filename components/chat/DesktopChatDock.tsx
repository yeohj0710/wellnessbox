"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ChatInput from "@/app/chat/components/ChatInput";
import ProfileBanner from "@/app/chat/components/ProfileBanner";
import useChat from "@/app/chat/hooks/useChat";
import MessageBubble from "@/app/chat/components/MessageBubble";
import ProfileModal from "@/app/chat/components/ProfileModal";
import ReferenceData from "@/app/chat/components/ReferenceData";
import RecommendedProductActions from "@/app/chat/components/RecommendedProductActions";

const VERTICAL_SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);
const SCROLL_EPSILON = 1;

function isScrollableY(node: HTMLElement) {
  const { overflowY } = window.getComputedStyle(node);
  if (!VERTICAL_SCROLLABLE_OVERFLOW.has(overflowY)) return false;
  return node.scrollHeight > node.clientHeight + SCROLL_EPSILON;
}

function findScrollableWithinBoundary(
  start: HTMLElement | null,
  boundary: HTMLElement
) {
  let cursor: HTMLElement | null = start;
  while (cursor && cursor !== boundary) {
    if (isScrollableY(cursor)) return cursor;
    cursor = cursor.parentElement;
  }
  return isScrollableY(boundary) ? boundary : null;
}

function shouldPreventScrollChain(scrollable: HTMLElement, deltaY: number) {
  if (deltaY < 0) return scrollable.scrollTop <= SCROLL_EPSILON;
  const remaining =
    scrollable.scrollHeight - scrollable.clientHeight - scrollable.scrollTop;
  return remaining <= SCROLL_EPSILON;
}

type DockPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DesktopChatDock() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);

  if (pathname?.startsWith("/chat")) return null;

  const openDock = () => {
    setHasBooted(true);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] right-3 z-[45] sm:bottom-7 sm:right-5">
      <button
        type="button"
        onClick={openDock}
        className={`group relative z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-16 sm:w-auto sm:gap-2.5 sm:px-5 sm:pr-6 lg:gap-3 lg:px-6 ${
          isOpen
            ? "translate-y-2 scale-95 opacity-0 pointer-events-none"
            : "translate-y-0 scale-100 opacity-100 pointer-events-auto"
        }`}
        aria-label="AI 맞춤 상담 열기"
        title="AI 맞춤 상담 열기"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 via-cyan-500 to-indigo-500 text-white shadow-sm">
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
        </span>
        <span className="absolute -left-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white sm:hidden">
          AI
        </span>
        <span className="hidden whitespace-nowrap text-[15px] font-semibold text-slate-800 sm:inline">
          AI 맞춤 상담
        </span>
        <span className="hidden h-2.5 w-2.5 rounded-full bg-emerald-500 sm:inline-block" />
      </button>

      {hasBooted && (
        <DesktopChatDockPanel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function DesktopChatDockPanel({ isOpen, onClose }: DockPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement | null>(null);
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
  } = useChat({ manageFooter: false, remoteBootstrap: false });

  useEffect(() => {
    if (!isOpen) {
      setSessionsOpen(false);
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, active?.messages.length, messagesEndRef]);

  useEffect(() => {
    if (!isOpen) return;
    const boundary = panelRef.current;
    if (!boundary) return;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      const target =
        event.target instanceof HTMLElement ? event.target : boundary;
      const scrollable = findScrollableWithinBoundary(target, boundary);

      if (!scrollable) {
        event.preventDefault();
        return;
      }

      if (shouldPreventScrollChain(scrollable, event.deltaY)) {
        event.preventDefault();
      }
    };

    boundary.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      boundary.removeEventListener("wheel", onWheel as EventListener);
    };
  }, [isOpen]);

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
    <aside
      ref={panelRef}
      className={`absolute bottom-0 right-0 z-10 flex h-[min(82vh,760px)] w-[min(calc(100vw-24px),430px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] transition-all duration-200 sm:w-[420px] xl:w-[460px] ${
        isOpen
          ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-3 scale-95 opacity-0 pointer-events-none"
      }`}
      style={{ display: isOpen ? "flex" : "none" }}
      aria-hidden={!isOpen}
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
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {active?.title || "AI 맞춤 상담"}
            </p>
            <p className="text-[11px] text-slate-500">복용 맥락 기반 상담 도우미</p>
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
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="채팅 닫기"
            title="닫기"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f8fafc_38%,_#ffffff_100%)]">
        <div
          className={`absolute inset-y-0 left-0 z-20 w-[min(78%,260px)] border-r border-slate-200 bg-white transition-transform duration-200 ${
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
          <ul className="max-h-[calc(100%-92px)] overflow-y-auto overscroll-contain p-2">
            {sessions.map((session) => (
              <li key={session.id} className="mb-1">
                <div
                  className={`flex items-center gap-1 rounded-md border px-1 py-1 ${
                    activeId === session.id
                      ? "border-slate-200 bg-slate-100"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(session.id);
                      setSessionsOpen(false);
                    }}
                    className="min-w-0 flex-1 cursor-pointer rounded-md px-1.5 py-1 text-left"
                  >
                    <span className="block truncate text-xs font-medium text-slate-800">
                      {session.title || "새 상담"}
                    </span>
                  </button>

                  {activeId === session.id && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleRename(session.id, session.title || "새 상담")
                    }
                    className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100"
                    title="이름 변경"
                    aria-label="이름 변경"
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleDelete(session.id, session.title || "새 상담")
                    }
                    className="shrink-0 rounded p-1 text-rose-500 hover:bg-rose-50"
                    title="삭제"
                    aria-label="삭제"
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
          className="h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-3"
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
  );
}
