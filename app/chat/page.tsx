"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import ChatInput from "./components/ChatInput";
import ProfileBanner from "./components/ProfileBanner";
import ChatTopBar from "./components/ChatTopBar";
import useChat from "./hooks/useChat";

const MessageBubble = dynamic(() => import("./components/MessageBubble"));
const ProfileModal = dynamic(() => import("./components/ProfileModal"), {
  ssr: false,
});
const ChatDrawer = dynamic(() => import("./components/ChatDrawer"), {
  ssr: false,
});
const ReferenceData = dynamic(() => import("./components/ReferenceData"), {
  ssr: false,
});
const RecommendedProductActions = dynamic(
  () => import("./components/RecommendedProductActions"),
  { ssr: false }
);

export default function ChatPage() {
  const {
    sessions,
    activeId,
    setActiveId,
    profile,
    setShowSettings,
    showSettings,
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
    interactiveActions,
    actionLoading,
    bootstrapPending,
    titleLoading,
    titleError,
    topTitleHighlight,
    input,
    setInput,
    loading,
    sendMessage,
    stopStreaming,
    newChat,
    deleteChat,
    renameChat,
    handleInteractiveAction,
    messagesContainerRef,
    messagesEndRef,
    active,
    generateTitle,
    handleProfileChange,
  } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

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
            retryTitle={generateTitle}
            highlight={topTitleHighlight}
          />
        </div>
      </div>
      <div className="h-12" />
      <main className="flex-1 flex flex-col">
        <div
          className="
            mx-auto max-w-3xl w-full px-5 sm:px-6 md:px-8 flex-1 pt-4
            pb-[calc(100vh-240px)]     
            sm:pb-[calc(100vh-210px)]
            overflow-y-auto
          "
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
          <div className="mx-auto max-w-3xl space-y-4">
            {bootstrapPending &&
              (!active || active.messages.length === 0) && (
                <div className="mx-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                    <p className="text-sm font-medium text-slate-700">
                      AI 상담을 준비 중이에요...
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-11/12 animate-pulse rounded bg-slate-200" />
                    <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              )}
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
                  {m.role === "assistant" && (
                    <RecommendedProductActions content={m.content} />
                  )}
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={() => sendMessage()}
          loading={loading}
          disabled={bootstrapPending}
          quickActionLoading={actionLoading}
          suggestions={suggestions}
          onSelectSuggestion={(q) => sendMessage(q)}
          quickActions={interactiveActions}
          onSelectQuickAction={handleInteractiveAction}
          onStop={stopStreaming}
        />
      </main>
      <ChatDrawer
        sessions={sessions}
        activeId={activeId}
        setActiveId={setActiveId}
        deleteChat={deleteChat}
        renameChat={renameChat}
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
          onChange={handleProfileChange}
        />
      )}
    </div>
  );
}
