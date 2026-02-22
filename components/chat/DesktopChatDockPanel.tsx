"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { buildAssistantLoadingMetaMap } from "./DesktopChatDockPanel.loading";
import {
  blurFocusedDescendant,
  consumeDockPrompt,
  findScrollableWithinBoundary,
  shouldPreventScrollChain,
} from "./DesktopChatDock.layout";

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
  const panelRef = useRef<HTMLElement | null>(null);
  const sessionsLayerRef = useRef<HTMLDivElement | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const {
    isResizing,
    isDragging,
    showResizeHint,
    dismissResizeHint,
    startResize,
    startDrag,
    panelInlineStyle,
  } = useDesktopChatDockLayout({
    isOpen,
    panelRef,
  });
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

  useEffect(() => {
    if (!isOpen) return;
    if (!activeId || loading || bootstrapPending || actionLoading) return;
    const prompt = consumeDockPrompt();
    if (!prompt) return;
    void sendMessage(prompt);
  }, [activeId, actionLoading, bootstrapPending, isOpen, loading, sendMessage]);

  const assistantLoadingMetaByIndex = useMemo(() => {
    if (!active) {
      return new Map<number, { contextText: string; userTurnCountBefore: number }>();
    }
    return buildAssistantLoadingMetaMap(active.messages);
  }, [active]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (isOpen) {
      panel.removeAttribute("inert");
      return;
    }
    blurFocusedDescendant(panel);
    panel.setAttribute("inert", "");
  }, [isOpen]);

  useEffect(() => {
    const layer = sessionsLayerRef.current;
    if (!layer) return;
    if (sessionsOpen) {
      layer.removeAttribute("inert");
      return;
    }
    blurFocusedDescendant(layer);
    layer.setAttribute("inert", "");
  }, [sessionsOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSessionsOpen(false);
      return;
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
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

  const closeSessionsPanel = () => {
    blurFocusedDescendant(panelRef.current);
    setSessionsOpen(false);
  };

  const toggleSessionsPanel = () => {
    setSessionsOpen((prev) => {
      if (!prev) return true;
      blurFocusedDescendant(panelRef.current);
      return false;
    });
  };

  const handleCloseDock = () => {
    closeSessionsPanel();
    onClose();
  };

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
          orders={orders}
          assessResult={assessResult}
          checkAiResult={checkAiResult}
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
          onCreateSession={() => {
            newChat();
            closeSessionsPanel();
          }}
          onSelectSession={(sessionId) => {
            setActiveId(sessionId);
            closeSessionsPanel();
          }}
          onRenameSession={handleRename}
          onDeleteSession={(sessionId, title) => {
            void handleDelete(sessionId, title);
          }}
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
