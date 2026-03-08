"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { ChatMessage } from "@/types/chat";
import {
  buildAssistantLoadingMetaMap,
  type AssistantLoadingMeta,
} from "./DesktopChatDockPanel.loading";
import {
  blurFocusedDescendant,
  consumeDockPrompt,
  findScrollableWithinBoundary,
  shouldPreventScrollChain,
} from "./DesktopChatDock.layout";

type UseDesktopChatDockPanelShellOptions = {
  isOpen: boolean;
  onClose: () => void;
  activeId: string | null;
  activeMessages: ChatMessage[] | null;
  loading: boolean;
  bootstrapPending: boolean;
  actionLoading: boolean;
  sendMessage: (prompt?: string) => void | Promise<unknown>;
  renameChat: (sessionId: string, title: string) => void | Promise<unknown>;
  deleteChat: (sessionId: string) => Promise<unknown>;
  newChat: () => void | Promise<unknown>;
  setActiveId: (sessionId: string) => void;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
};

type UseDesktopChatDockPanelShellResult = {
  panelRef: MutableRefObject<HTMLElement | null>;
  sessionsLayerRef: MutableRefObject<HTMLDivElement | null>;
  sessionsOpen: boolean;
  assistantLoadingMetaByIndex: Map<number, AssistantLoadingMeta>;
  closeSessionsPanel: () => void;
  toggleSessionsPanel: () => void;
  handleCloseDock: () => void;
  handleCreateSession: () => void;
  handleSelectSession: (sessionId: string) => void;
  handleRenameSession: (sessionId: string, currentTitle: string) => void;
  handleDeleteSession: (sessionId: string, title: string) => void;
};

export function useDesktopChatDockPanelShell({
  isOpen,
  onClose,
  activeId,
  activeMessages,
  loading,
  bootstrapPending,
  actionLoading,
  sendMessage,
  renameChat,
  deleteChat,
  newChat,
  setActiveId,
  messagesEndRef,
}: UseDesktopChatDockPanelShellOptions): UseDesktopChatDockPanelShellResult {
  const panelRef = useRef<HTMLElement | null>(null);
  const sessionsLayerRef = useRef<HTMLDivElement | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const assistantLoadingMetaByIndex = useMemo(() => {
    if (!activeMessages) {
      return new Map<number, AssistantLoadingMeta>();
    }
    return buildAssistantLoadingMetaMap(activeMessages);
  }, [activeMessages]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeId || loading || bootstrapPending || actionLoading) return;
    const prompt = consumeDockPrompt();
    if (!prompt) return;
    void sendMessage(prompt);
  }, [activeId, actionLoading, bootstrapPending, isOpen, loading, sendMessage]);

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
  }, [activeMessages?.length, isOpen, messagesEndRef]);

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

  function closeSessionsPanel() {
    blurFocusedDescendant(panelRef.current);
    setSessionsOpen(false);
  }

  function toggleSessionsPanel() {
    setSessionsOpen((prev) => {
      if (!prev) return true;
      blurFocusedDescendant(panelRef.current);
      return false;
    });
  }

  function handleCloseDock() {
    closeSessionsPanel();
    onClose();
  }

  function handleCreateSession() {
    newChat();
    closeSessionsPanel();
  }

  function handleSelectSession(sessionId: string) {
    setActiveId(sessionId);
    closeSessionsPanel();
  }

  function handleRenameSession(sessionId: string, currentTitle: string) {
    const nextTitle = window.prompt("새 상담 제목을 입력해 주세요.", currentTitle);
    if (typeof nextTitle !== "string") return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    void renameChat(sessionId, trimmed);
  }

  function handleDeleteSession(sessionId: string, title: string) {
    const ok = window.confirm(`'${title}' 대화를 삭제할까요?`);
    if (!ok) return;
    void deleteChat(sessionId);
  }

  return {
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
  };
}
