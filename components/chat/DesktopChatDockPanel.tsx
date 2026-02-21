"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ChatInput from "@/app/chat/components/ChatInput";
import ProfileBanner from "@/app/chat/components/ProfileBanner";
import useChat from "@/app/chat/hooks/useChat";
import MessageBubble from "@/app/chat/components/MessageBubble";
import ProfileModal from "@/app/chat/components/ProfileModal";
import ReferenceData from "@/app/chat/components/ReferenceData";
import RecommendedProductActions from "@/app/chat/components/RecommendedProductActions";
import AssessmentActionCard from "@/app/chat/components/AssessmentActionCard";
import AgentCapabilityHub from "@/app/chat/components/AgentCapabilityHub";
import type { ChatPageAgentContext } from "@/lib/chat/page-agent-context";
import DesktopChatDockSessionLayer from "./DesktopChatDockSessionLayer";
import {
  DOCK_RESIZE_HINT_DISMISS_KEY,
  DOCK_RESIZE_HINT_WIDTH,
  blurFocusedDescendant,
  clampDockPosition,
  clampDockSize,
  consumeDockPrompt,
  edgeIncludesBottom,
  edgeIncludesLeft,
  edgeIncludesRight,
  edgeIncludesTop,
  emitChatDockLayout,
  findScrollableWithinBoundary,
  getDefaultDockPosition,
  getDefaultDockSize,
  loadDockPosition,
  loadDockSize,
  resizeCursorForEdge,
  saveDockPosition,
  saveDockSize,
  shouldPreventScrollChain,
  type DockDragState,
  type DockPanelPosition,
  type DockPanelSize,
  type DockResizeEdge,
  type DockResizeState,
  type DocumentScrollLockSnapshot,
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
  const [panelSize, setPanelSize] = useState<DockPanelSize>(() =>
    clampDockSize(loadDockSize() ?? getDefaultDockSize())
  );
  const [panelPosition, setPanelPosition] = useState<DockPanelPosition>(() =>
    clampDockPosition(
      loadDockPosition() ??
        getDefaultDockPosition(
          clampDockSize(loadDockSize() ?? getDefaultDockSize())
        ),
      clampDockSize(loadDockSize() ?? getDefaultDockSize())
    )
  );
  const panelSizeRef = useRef(panelSize);
  const panelPositionRef = useRef(panelPosition);
  const resizeStateRef = useRef<DockResizeState | null>(null);
  const dragStateRef = useRef<DockDragState | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const pendingResizeSizeRef = useRef<DockPanelSize | null>(null);
  const pendingResizePositionRef = useRef<DockPanelPosition | null>(null);
  const interactionDocumentLockRef =
    useRef<DocumentScrollLockSnapshot | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showResizeHint, setShowResizeHint] = useState(false);
  const [resizeHintDismissed, setResizeHintDismissed] = useState(false);
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
    const meta = new Map<
      number,
      { contextText: string; userTurnCountBefore: number }
    >();
    if (!active) return meta;

    let userTurnCount = 0;
    for (let index = 0; index < active.messages.length; index += 1) {
      const message = active.messages[index];
      if (message.role === "assistant") {
        let contextText = "";
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
          const prev = active.messages[cursor];
          if (prev.role !== "user") continue;
          if (typeof prev.content !== "string") continue;
          const text = prev.content.trim();
          if (!text) continue;
          contextText = text;
          break;
        }
        meta.set(index, {
          contextText,
          userTurnCountBefore: userTurnCount,
        });
      }
      if (message.role === "user") {
        userTurnCount += 1;
      }
    }
    return meta;
  }, [active]);

  const dismissResizeHint = () => {
    setShowResizeHint(false);
    setResizeHintDismissed(true);
    try {
      window.localStorage.setItem(DOCK_RESIZE_HINT_DISMISS_KEY, "1");
    } catch {}
  };

  const applyPanelSizeToDom = (size: DockPanelSize) => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
  };

  const applyPanelPositionToDom = (position: DockPanelPosition) => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
  };

  const lockInteractionScroll = useCallback((cursor: string) => {
    if (typeof document === "undefined") return;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    if (!interactionDocumentLockRef.current) {
      interactionDocumentLockRef.current = {
        bodyOverflow: bodyStyle.overflow,
        bodyTouchAction: bodyStyle.touchAction,
        bodyOverscrollBehavior: bodyStyle.overscrollBehavior,
        bodyUserSelect: bodyStyle.userSelect,
        bodyCursor: bodyStyle.cursor,
        rootOverflow: rootStyle.overflow,
        rootTouchAction: rootStyle.touchAction,
        rootOverscrollBehavior: rootStyle.overscrollBehavior,
      };
    }
    bodyStyle.overflow = "hidden";
    bodyStyle.touchAction = "none";
    bodyStyle.overscrollBehavior = "none";
    bodyStyle.userSelect = "none";
    bodyStyle.cursor = cursor;
    rootStyle.overflow = "hidden";
    rootStyle.touchAction = "none";
    rootStyle.overscrollBehavior = "none";
  }, []);

  const releaseInteractionScroll = useCallback(() => {
    if (typeof document === "undefined") return;
    const snapshot = interactionDocumentLockRef.current;
    if (!snapshot) return;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    bodyStyle.overflow = snapshot.bodyOverflow;
    bodyStyle.touchAction = snapshot.bodyTouchAction;
    bodyStyle.overscrollBehavior = snapshot.bodyOverscrollBehavior;
    bodyStyle.userSelect = snapshot.bodyUserSelect;
    bodyStyle.cursor = snapshot.bodyCursor;
    rootStyle.overflow = snapshot.rootOverflow;
    rootStyle.touchAction = snapshot.rootTouchAction;
    rootStyle.overscrollBehavior = snapshot.rootOverscrollBehavior;
    interactionDocumentLockRef.current = null;
  }, []);

  useEffect(() => {
    panelSizeRef.current = panelSize;
    applyPanelSizeToDom(panelSize);
  }, [panelSize]);

  useEffect(() => {
    panelPositionRef.current = panelPosition;
    applyPanelPositionToDom(panelPosition);
  }, [panelPosition]);

  useEffect(() => {
    const emitClosed = () =>
      emitChatDockLayout({
        open: false,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
      });

    const emitOpen = () => {
      const panel = panelRef.current;
      if (!panel) {
        emitClosed();
        return;
      }
      const rect = panel.getBoundingClientRect();
      emitChatDockLayout({
        open: true,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      });
    };

    if (!isOpen) {
      emitClosed();
      return;
    }

    const rafId = window.requestAnimationFrame(emitOpen);
    const onResize = () => emitOpen();
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (!isOpen) {
        emitClosed();
      }
    };
  }, [
    isOpen,
    panelPosition.left,
    panelPosition.top,
    panelSize.width,
    panelSize.height,
    isDragging,
    isResizing,
  ]);

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
    const restoredSize = clampDockSize(loadDockSize() ?? getDefaultDockSize());
    const restoredPosition = clampDockPosition(
      loadDockPosition() ?? getDefaultDockPosition(restoredSize),
      restoredSize
    );

    setPanelSize(restoredSize);
    panelSizeRef.current = restoredSize;
    applyPanelSizeToDom(restoredSize);

    setPanelPosition(restoredPosition);
    panelPositionRef.current = restoredPosition;
    applyPanelPositionToDom(restoredPosition);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setResizeHintDismissed(
        window.localStorage.getItem(DOCK_RESIZE_HINT_DISMISS_KEY) === "1"
      );
    } catch {}
  }, []);

  useEffect(() => {
    const onResize = () => {
      const nextSize = clampDockSize(panelSizeRef.current);
      panelSizeRef.current = nextSize;
      applyPanelSizeToDom(nextSize);
      setPanelSize(nextSize);

      const nextPosition = clampDockPosition(
        panelPositionRef.current,
        nextSize
      );
      panelPositionRef.current = nextPosition;
      applyPanelPositionToDom(nextPosition);
      setPanelPosition(nextPosition);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (resizeState) {
        event.preventDefault();
        const deltaX = event.clientX - resizeState.startX;
        const deltaY = event.clientY - resizeState.startY;
        let nextWidth = resizeState.startWidth;
        let nextHeight = resizeState.startHeight;
        let nextLeft = resizeState.startLeft;
        let nextTop = resizeState.startTop;

        if (edgeIncludesLeft(resizeState.edge)) {
          nextWidth = resizeState.startWidth - deltaX;
        }
        if (edgeIncludesRight(resizeState.edge)) {
          nextWidth = resizeState.startWidth + deltaX;
        }
        if (edgeIncludesTop(resizeState.edge)) {
          nextHeight = resizeState.startHeight - deltaY;
        }
        if (edgeIncludesBottom(resizeState.edge)) {
          nextHeight = resizeState.startHeight + deltaY;
        }

        const clampedSize = clampDockSize({
          width: nextWidth,
          height: nextHeight,
        });
        panelSizeRef.current = clampedSize;
        pendingResizeSizeRef.current = clampedSize;

        if (edgeIncludesLeft(resizeState.edge)) {
          nextLeft =
            resizeState.startLeft +
            (resizeState.startWidth - clampedSize.width);
        }
        if (edgeIncludesTop(resizeState.edge)) {
          nextTop =
            resizeState.startTop +
            (resizeState.startHeight - clampedSize.height);
        }

        const clampedPosition = clampDockPosition(
          { left: nextLeft, top: nextTop },
          clampedSize
        );
        panelPositionRef.current = clampedPosition;
        pendingResizePositionRef.current = clampedPosition;

        if (resizeRafRef.current !== null) return;
        resizeRafRef.current = window.requestAnimationFrame(() => {
          resizeRafRef.current = null;
          const nextSize = pendingResizeSizeRef.current;
          const nextPosition = pendingResizePositionRef.current;
          if (nextSize) {
            applyPanelSizeToDom(nextSize);
          }
          if (nextPosition) {
            applyPanelPositionToDom(nextPosition);
          }
        });
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState) return;
      event.preventDefault();

      const nextPosition = clampDockPosition(
        {
          left: dragState.startLeft + (event.clientX - dragState.startX),
          top: dragState.startTop + (event.clientY - dragState.startY),
        },
        panelSizeRef.current
      );
      panelPositionRef.current = nextPosition;
      applyPanelPositionToDom(nextPosition);
    };

    const stopInteraction = () => {
      const wasResizing = Boolean(resizeStateRef.current);
      const wasDragging = Boolean(dragStateRef.current);
      if (!wasResizing && !wasDragging) return;

      resizeStateRef.current = null;
      dragStateRef.current = null;

      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
      pendingResizePositionRef.current = null;

      setIsResizing(false);
      setIsDragging(false);
      releaseInteractionScroll();

      const committedSize = panelSizeRef.current;
      const committedPosition = clampDockPosition(
        panelPositionRef.current,
        committedSize
      );

      applyPanelSizeToDom(committedSize);
      applyPanelPositionToDom(committedPosition);
      panelPositionRef.current = committedPosition;

      if (wasResizing) {
        setPanelSize(committedSize);
        saveDockSize(committedSize);
      }

      if (wasResizing || wasDragging) {
        setPanelPosition(committedPosition);
        saveDockPosition(committedPosition);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopInteraction);
    window.addEventListener("pointercancel", stopInteraction);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopInteraction);
      window.removeEventListener("pointercancel", stopInteraction);
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
      pendingResizePositionRef.current = null;
      releaseInteractionScroll();
    };
  }, [releaseInteractionScroll]);

  useEffect(() => {
    if (isOpen) return;
    resizeStateRef.current = null;
    dragStateRef.current = null;
    if (resizeRafRef.current !== null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    pendingResizeSizeRef.current = null;
    pendingResizePositionRef.current = null;
    setIsResizing(false);
    setIsDragging(false);
    releaseInteractionScroll();
  }, [isOpen, releaseInteractionScroll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen || resizeHintDismissed || isResizing) {
      setShowResizeHint(false);
      return;
    }
    if (panelSize.width > DOCK_RESIZE_HINT_WIDTH) {
      setShowResizeHint(false);
      return;
    }
    setShowResizeHint(true);
    const timer = window.setTimeout(() => setShowResizeHint(false), 9000);
    return () => window.clearTimeout(timer);
  }, [isOpen, isResizing, panelSize.width, resizeHintDismissed]);

  const startResize = (
    event: ReactPointerEvent<HTMLElement>,
    edge: DockResizeEdge
  ) => {
    if (!isOpen) return;
    if (event.button !== 0) return;
    setShowResizeHint(false);
    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = null;
    setIsDragging(false);

    resizeStateRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: panelSizeRef.current.width,
      startHeight: panelSizeRef.current.height,
      startLeft: panelPositionRef.current.left,
      startTop: panelPositionRef.current.top,
    };
    setIsResizing(true);
    lockInteractionScroll(resizeCursorForEdge(edge));
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isOpen) return;
    if (event.button !== 0) return;
    if (isResizing) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("button, a, input, textarea, select, [role='button']")
    ) {
      return;
    }

    setShowResizeHint(false);
    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: panelPositionRef.current.left,
      startTop: panelPositionRef.current.top,
    };
    setIsDragging(true);
    lockInteractionScroll("grabbing");
  };

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
      style={{
        width: `${(isResizing ? panelSizeRef.current : panelSize).width}px`,
        height: `${(isResizing ? panelSizeRef.current : panelSize).height}px`,
        left: `${
          (isResizing || isDragging ? panelPositionRef.current : panelPosition)
            .left
        }px`,
        top: `${
          (isResizing || isDragging ? panelPositionRef.current : panelPosition)
            .top
        }px`,
      }}
    >
      {showResizeHint && (
        <div className="pointer-events-none absolute left-3 top-14 z-[65] hidden sm:block">
          <div className="pointer-events-auto relative max-w-[250px] rounded-xl border border-sky-200 bg-white px-3 py-2 shadow-[0_14px_32px_rgba(15,23,42,0.16)]">
            <p className="text-[12px] font-semibold text-slate-800">
              채팅창이 좁으면 늘려서 사용해보세요!
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              왼쪽 위 모서리를 드래그하면 대화와 추천 목록이 더 잘 보여요.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={dismissResizeHint}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              >
                확인
              </button>
            </div>
            <span className="absolute -left-1 top-5 h-2.5 w-2.5 rotate-45 border-b border-l border-sky-200 bg-white" />
          </div>
        </div>
      )}
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "left")}
        className="absolute -left-1 top-0 z-40 hidden h-full w-3 cursor-ew-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "right")}
        className="absolute -right-1 top-0 z-40 hidden h-full w-3 cursor-ew-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "top")}
        className="absolute left-0 -top-1 z-40 hidden h-3 w-full cursor-ns-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "bottom")}
        className="absolute -bottom-1 left-0 z-40 hidden h-3 w-full cursor-ns-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "top-left")}
        className="absolute -left-1 -top-1 z-50 hidden h-4 w-4 cursor-nwse-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "top-right")}
        className="absolute -right-1 -top-1 z-50 hidden h-4 w-4 cursor-nesw-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "bottom-left")}
        className="absolute -bottom-1 -left-1 z-50 hidden h-4 w-4 cursor-nesw-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "bottom-right")}
        className="absolute -bottom-1 -right-1 z-50 hidden h-4 w-4 cursor-nwse-resize touch-none sm:block"
      />
      <header
        onPointerDown={startDrag}
        className={`flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleSessionsPanel}
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
              {active?.title || "AI 에이전트"}
            </p>
            <p className="text-[11px] text-slate-500">
              건강·구매 흐름 통합 실행 어시스턴트
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
            onClick={() =>
              router.push(
                `/chat?from=${encodeURIComponent(
                  fromPath || pageAgentContext?.routePath || "dock"
                )}`
              )
            }
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="채팅 전체 화면"
            title="전체 화면 열기"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCloseDock}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="채팅 닫기"
            title="닫기"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f8fafc_38%,_#ffffff_100%)]">
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
              {bootstrapPending &&
                (!active || active.messages.length === 0) && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                      <p className="text-xs font-medium text-slate-700">
                        AI 상담 준비 중...
                      </p>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-2 w-11/12 animate-pulse rounded bg-slate-200" />
                      <div className="h-2 w-4/5 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                )}
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
                    <MessageBubble
                      role={message.role}
                      content={message.content}
                      loadingContextText={
                        message.role === "assistant"
                          ? assistantLoadingMetaByIndex.get(index)
                              ?.contextText || ""
                          : ""
                      }
                      loadingUserTurnCount={
                        message.role === "assistant"
                          ? assistantLoadingMetaByIndex.get(index)
                              ?.userTurnCountBefore ?? 0
                          : 0
                      }
                    />
                    {message.role === "assistant" && (
                      <RecommendedProductActions content={message.content} />
                    )}
                  </div>
                ))}
              <AgentCapabilityHub
                visible={showAgentCapabilityHub}
                actions={agentCapabilityActions}
                disabled={loading || bootstrapPending || actionLoading}
                onRunPrompt={(prompt) => sendMessage(prompt)}
                onRunAction={handleInteractiveAction}
              />
              <AssessmentActionCard
                prompt={inChatAssessmentPrompt}
                disabled={loading || bootstrapPending}
                onSelectOption={(label) => sendMessage(label)}
                onCancel={cancelInChatAssessment}
                onOpenPage={openAssessmentPageFromChat}
              />
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

