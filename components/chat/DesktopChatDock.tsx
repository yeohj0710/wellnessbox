"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  SparklesIcon,
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
  const {
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
    messagesContainerRef,
    messagesEndRef,
    active,
    handleProfileChange,
  } = useChat({ manageFooter: false });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, messagesEndRef]);

  return (
    <aside className="fixed bottom-0 right-6 z-20 hidden h-[min(78vh,760px)] w-[390px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_-8px_28px_rgba(15,23,42,0.18)] xl:flex">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {active?.title || "AI 맞춤 상담"}
            </p>
            <p className="text-[11px] text-slate-500">
              웰니스 상담 도우미와 바로 대화
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
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
        </div>
      </header>

      <div className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f8fafc_38%,_#ffffff_100%)]">
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
  );
}
