"use client";

import { useRouter } from "next/navigation";
import ChatInput from "@/app/chat/components/ChatInput";
import useChat from "@/app/chat/hooks/useChat";
import ProfileModal from "@/app/chat/components/ProfileModal";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import DesktopChatDockSessionLayer from "./DesktopChatDockSessionLayer";
import DesktopChatDockPanelHeader from "./DesktopChatDockPanelHeader";
import DesktopChatDockResizeOverlay from "./DesktopChatDockResizeOverlay";
import DesktopChatDockMessageFeed from "./DesktopChatDockMessageFeed";
import { useDesktopChatDockLayout } from "./useDesktopChatDockLayout";
import { useDesktopChatDockPanelShell } from "./useDesktopChatDockPanelShell";

type DockPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  pageAgentContext: ChatPageAgentContext | null;
  fromPath: string;
};

function DesktopChatDockPanel({
  isOpen,
  onClose,
  pageAgentContext,
  fromPath,
}: DockPanelProps) {
  const router = useRouter();
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
    healthLink,
    orders,
    userContextSummary,
    suggestions,
    interactiveActions,
    showAgentGuide,
    agentGuideExamples,
    showAgentCapabilityHub,
    agentCapabilityActions,
    inChatAssessmentPrompt,
    actionLoading,
    bootstrapPending,
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
    handleProfileChange,
    titleLoading,
    titleError,
    generateTitle,
  } = useChat({
    manageFooter: false,
    remoteBootstrap: false,
    enableAutoInit: isOpen,
    pageContext: pageAgentContext,
  });
  const {
    panelRef,
    sessionsLayerRef,
    sessionsOpen,
    assistantLoadingMetaByIndex,
    closeSessionsPanel,
    toggleSessionsPanel,
    handleCloseDock,
    handleCreateSession,
    handleSelectSession,
    handleRenameSession,
    handleDeleteSession,
  } = useDesktopChatDockPanelShell({
    isOpen,
    onClose,
    activeId,
    activeMessages: active?.messages || null,
    loading,
    bootstrapPending,
    actionLoading,
    sendMessage,
    renameChat,
    deleteChat,
    newChat,
    setActiveId,
    messagesEndRef,
  });
  const {
    isResizing,
    isDragging,
    showResizeHint,
    resizeHintDurationMs,
    dismissResizeHint,
    startResize,
    startDrag,
    panelInlineStyle,
  } = useDesktopChatDockLayout({
    isOpen,
    panelRef,
  });

  return (
    <aside
      ref={panelRef}
      className={`fixed z-10 isolate flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] will-change-[transform,opacity,left,top] transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        isOpen
          ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-4 scale-95 opacity-0 pointer-events-none"
      } ${isResizing || isDragging ? "select-none transition-none" : ""}`}
      style={panelInlineStyle}
    >
      <DesktopChatDockResizeOverlay
        showResizeHint={showResizeHint}
        resizeHintDurationMs={resizeHintDurationMs}
        onDismissResizeHint={dismissResizeHint}
        onStartResize={startResize}
      />
      <DesktopChatDockPanelHeader
        activeTitle={active?.title || "AI 에이전트"}
        sessionsOpen={sessionsOpen}
        isDragging={isDragging}
        titleLoading={titleLoading}
        titleError={titleError}
        onToggleSessions={toggleSessionsPanel}
        onRetryTitle={generateTitle}
        onNewChat={newChat}
        onOpenSettings={() => setShowSettings(true)}
        onOpenFullscreen={() =>
          router.push(
            `/chat?from=${encodeURIComponent(
              fromPath || pageAgentContext?.routePath || "dock"
            )}`
          )
        }
        onCloseDock={handleCloseDock}
        onStartDrag={startDrag}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <DesktopChatDockMessageFeed
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          profileLoaded={profileLoaded}
          profile={profile}
          showProfileBanner={showProfileBanner}
          onEditProfile={() => setShowSettings(true)}
          onCloseProfileBanner={() => setShowProfileBanner(false)}
          bootstrapPending={bootstrapPending}
          active={active}
          userContextSummary={userContextSummary}
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
        />

        <ChatInput
          mode="embedded"
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

        <DesktopChatDockSessionLayer
          sessionsLayerRef={sessionsLayerRef}
          sessionsOpen={sessionsOpen}
          sessions={sessions}
          activeId={activeId}
          onClose={closeSessionsPanel}
          onCreateSession={handleCreateSession}
          onSelectSession={handleSelectSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

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

export default DesktopChatDockPanel;
