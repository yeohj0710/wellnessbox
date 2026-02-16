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
            <div ref={messagesEndRef} />
          </div>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={() => sendMessage()}
          loading={loading}
          suggestions={suggestions}
          onSelectSuggestion={(q) => sendMessage(q)}
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
