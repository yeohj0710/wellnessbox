"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import ChatInput from "./components/ChatInput";
import ProfileBanner from "./components/ProfileBanner";
import ChatTopBar from "./components/ChatTopBar";
import useChat from "./hooks/useChat";
import { buildPageAgentContext } from "@/lib/chat/page-agent-context";
import { buildAssistantLoadingMetaMap } from "@/components/chat/DesktopChatDockPanel.loading";

const ProfileModal = dynamic(() => import("./components/ProfileModal"), {
  ssr: false,
});
const ChatDrawer = dynamic(() => import("./components/ChatDrawer"), {
  ssr: false,
});
const ChatConversationTimeline = dynamic(
  () => import("./components/ChatConversationTimeline"),
  { ssr: false }
);

export default function ChatPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const draft = (searchParams.get("draft") || "").trim();
  const pageContext = useMemo(() => {
    const fallbackPath = pathname || "/chat";
    const trimmedFrom = (from || "").trim();

    if (!trimmedFrom) {
      return buildPageAgentContext({
        pathname: fallbackPath,
        searchParams,
      });
    }

    const queryIndex = trimmedFrom.indexOf("?");
    const fromPath =
      queryIndex >= 0 ? trimmedFrom.slice(0, queryIndex) : trimmedFrom;
    const fromQuery = queryIndex >= 0 ? trimmedFrom.slice(queryIndex + 1) : "";

    return buildPageAgentContext({
      pathname: fromPath || fallbackPath,
      searchParams: fromQuery ? new URLSearchParams(fromQuery) : searchParams,
    });
  }, [from, pathname, searchParams]);

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
    healthLink,
    orders,
    userContextSummary,
    titleHighlightId,
    suggestions,
    interactiveActions,
    showAgentGuide,
    agentGuideExamples,
    showAgentCapabilityHub,
    agentCapabilityActions,
    actionLoading,
    bootstrapPending,
    titleLoading,
    titleError,
    topTitleHighlight,
    inChatAssessmentPrompt,
    input,
    setInput,
    loading,
    sendMessage,
    stopStreaming,
    newChat,
    deleteChat,
    renameChat,
    handleInteractiveAction,
    cancelInChatAssessment,
    openAssessmentPageFromChat,
    messagesContainerRef,
    messagesEndRef,
    active,
    generateTitle,
    handleProfileChange,
  } = useChat({
    pageContext,
  });
  const appliedDraftRef = useRef("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, messagesEndRef]);

  useEffect(() => {
    if (!draft) return;
    if (appliedDraftRef.current === draft) return;
    if (input.trim()) return;
    setInput(draft);
    appliedDraftRef.current = draft;
  }, [draft, input, setInput]);

  const assistantLoadingMetaByIndex = useMemo(() => {
    return active ? buildAssistantLoadingMetaMap(active.messages) : new Map();
  }, [active]);

  return (
    <div className="relative flex min-h-[calc(100vh-56px)] w-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <div className="fixed left-0 right-0 top-14 z-10">
        <div className="mx-auto w-full max-w-3xl">
          <ChatTopBar
            openDrawer={openDrawer}
            newChat={newChat}
            openSettings={() => setShowSettings(true)}
            title={active?.title || "AI 상담"}
            titleLoading={titleLoading}
            titleError={titleError}
            retryTitle={generateTitle}
            highlight={topTitleHighlight}
          />
        </div>
      </div>
      <div className="h-12" />
      <main className="flex flex-1 flex-col">
        <div
          className="
            mx-auto max-w-3xl w-full px-5 sm:px-6 md:px-8 flex-1 pt-4
            pb-[calc(100vh-240px)]
            sm:pb-[calc(100vh-210px)]
            overflow-y-auto
          "
          ref={messagesContainerRef}
        >
          {profileLoaded && !profile ? (
            <ProfileBanner
              profile={profile}
              show={showProfileBanner}
              onEdit={() => setShowSettings(true)}
              onClose={() => setShowProfileBanner(false)}
            />
          ) : null}

          <div className="mx-auto max-w-3xl space-y-4">
            <ChatConversationTimeline
              active={active}
              bootstrapPending={bootstrapPending}
              bootstrapFallback={
                <div className="mx-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                    <p className="text-sm font-medium text-slate-700">
                      AI 상담을 준비하고 있어요...
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-11/12 animate-pulse rounded bg-slate-200" />
                    <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              }
              summary={userContextSummary}
              orders={orders}
              assessResult={assessResult}
              checkAiResult={checkAiResult}
              healthLink={healthLink}
              assistantLoadingMetaByIndex={assistantLoadingMetaByIndex}
              showAgentCapabilityHub={showAgentCapabilityHub}
              agentCapabilityActions={agentCapabilityActions}
              loading={loading}
              actionLoading={actionLoading}
              onRunPrompt={(prompt) => sendMessage(prompt)}
              onRunAction={handleInteractiveAction}
              inChatAssessmentPrompt={inChatAssessmentPrompt}
              onCancelInChatAssessment={cancelInChatAssessment}
              onOpenAssessmentPage={openAssessmentPageFromChat}
              messagesEndRef={messagesEndRef}
            />
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
          onSelectSuggestion={(question) => sendMessage(question)}
          showAgentGuide={showAgentGuide}
          agentExamples={agentGuideExamples}
          onSelectAgentExample={(prompt) => sendMessage(prompt)}
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
      {showSettings ? (
        <ProfileModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onChange={handleProfileChange}
        />
      ) : null}
    </div>
  );
}
