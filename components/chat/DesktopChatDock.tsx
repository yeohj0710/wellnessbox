"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import AssessmentActionCard from "@/app/chat/components/AssessmentActionCard";
import AgentCapabilityHub from "@/app/chat/components/AgentCapabilityHub";

const VERTICAL_SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);
const SCROLL_EPSILON = 1;
const DOCK_SIZE_STORAGE_KEY = "wb_chat_dock_size_v1";
const DOCK_MIN_WIDTH = 320;
const DOCK_MIN_HEIGHT = 420;
const DOCK_VIEWPORT_GAP_X = 24;
const DOCK_VIEWPORT_GAP_Y = 32;
const DOCK_RESIZE_HINT_DISMISS_KEY = "wb_chat_dock_resize_hint_dismissed_v1";
const DOCK_RESIZE_HINT_WIDTH = 420;
const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";

type DockPanelSize = {
  width: number;
  height: number;
};

type DockResizeEdge = "left" | "top" | "corner";

type DockResizeState = {
  edge: DockResizeEdge;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

type ChatDockLayoutDetail = {
  open: boolean;
  left: number;
  right: number;
  width: number;
  height: number;
};

function emitChatDockLayout(detail: ChatDockLayoutDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_DOCK_LAYOUT_EVENT, { detail }));
}

function clampDockSize(size: DockPanelSize): DockPanelSize {
  if (typeof window === "undefined") {
    return size;
  }

  const maxWidth = Math.max(280, window.innerWidth - DOCK_VIEWPORT_GAP_X);
  const maxHeight = Math.max(320, window.innerHeight - DOCK_VIEWPORT_GAP_Y);
  const minWidth = Math.min(DOCK_MIN_WIDTH, maxWidth);
  const minHeight = Math.min(DOCK_MIN_HEIGHT, maxHeight);

  return {
    width: Math.round(Math.min(maxWidth, Math.max(minWidth, size.width))),
    height: Math.round(Math.min(maxHeight, Math.max(minHeight, size.height))),
  };
}

function getDefaultDockSize(): DockPanelSize {
  if (typeof window === "undefined") {
    return { width: 420, height: 640 };
  }

  const preferredWidth = window.innerWidth >= 1280 ? 460 : 420;
  const preferredHeight = Math.min(Math.round(window.innerHeight * 0.82), 760);
  return clampDockSize({ width: preferredWidth, height: preferredHeight });
}

function loadDockSize(): DockPanelSize | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCK_SIZE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DockPanelSize> | null;
    if (!parsed) return null;
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
  } catch {
    return null;
  }
}

function saveDockSize(size: DockPanelSize) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOCK_SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // ignore storage failures
  }
}

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

function blurFocusedDescendant(container: HTMLElement | null) {
  if (!container) return;
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    container.contains(activeElement)
  ) {
    activeElement.blur();
  }
}

type DockPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DesktopChatDock() {
  const pathname = usePathname();
  const isChatRoute = pathname?.startsWith("/chat") ?? false;
  const [isOpen, setIsOpen] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const requestOpenDock = useCallback(() => {
    if (isChatRoute) return;
    if (hasBooted) {
      setPendingOpen(false);
      setIsOpen(true);
      return;
    }
    // Keep intent first, then open immediately when lazy boot completes.
    setPendingOpen(true);
    setHasBooted(true);
  }, [hasBooted, isChatRoute]);

  useEffect(() => {
    if (!pendingOpen) return;
    if (!hasBooted) return;
    if (isChatRoute) return;
    setIsOpen(true);
    setPendingOpen(false);
  }, [hasBooted, isChatRoute, pendingOpen]);

  useEffect(() => {
    if (isChatRoute) return;
    if (hasBooted) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const boot = () => {
      if (cancelled) return;
      setHasBooted(true);
    };

    const requestIdle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout?: number }) => number)
      | undefined;
    if (typeof requestIdle === "function") {
      const id = requestIdle(boot, { timeout: 1200 });
      return () => {
        cancelled = true;
        const cancelIdle = (window as any).cancelIdleCallback as
          | ((handle: number) => void)
          | undefined;
        if (typeof cancelIdle === "function") {
          cancelIdle(id);
        }
      };
    }

    const timer = window.setTimeout(boot, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasBooted, isChatRoute]);

  useEffect(() => {
    if (isChatRoute) return;
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isChatRoute]);

  useEffect(() => {
    if (!isChatRoute) return;
    setPendingOpen(false);
    setIsOpen(false);
    emitChatDockLayout({
      open: false,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
    });
  }, [isChatRoute]);

  useEffect(() => {
    const handleCloseDock = () => {
      setPendingOpen(false);
      setIsOpen(false);
      emitChatDockLayout({
        open: false,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
      });
    };
    const handleOpenDock = () => requestOpenDock();
    window.addEventListener("wb:chat-close-dock", handleCloseDock);
    window.addEventListener("wb:chat-open-dock", handleOpenDock);
    window.addEventListener("openCart", handleCloseDock);
    return () => {
      window.removeEventListener("wb:chat-close-dock", handleCloseDock);
      window.removeEventListener("wb:chat-open-dock", handleOpenDock);
      window.removeEventListener("openCart", handleCloseDock);
    };
  }, [requestOpenDock]);

  if (isChatRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-[58] flex justify-end px-3 sm:bottom-7 sm:left-auto sm:right-5 sm:px-0">
      <button
        type="button"
        onPointerDown={requestOpenDock}
        onClick={requestOpenDock}
        className={`group relative z-20 ml-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-[transform,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-16 sm:w-auto sm:gap-2.5 sm:px-5 sm:pr-6 lg:gap-3 lg:px-6 ${
          isOpen
            ? "translate-y-2 scale-95 opacity-0 pointer-events-none"
            : pendingOpen
              ? "translate-y-0 scale-100 opacity-80 pointer-events-none"
              : "translate-y-0 scale-100 opacity-100 pointer-events-auto"
        }`}
        aria-label="AI 에이전트 열기"
        title="AI 에이전트 열기"
        aria-busy={pendingOpen}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-500 via-cyan-500 to-indigo-500 text-white shadow-sm">
          {pendingOpen ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          )}
        </span>
        <span className="absolute -left-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white sm:hidden">
          AI
        </span>
        <span className="hidden whitespace-nowrap text-[15px] font-semibold text-slate-800 sm:inline">
          AI 에이전트
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
  const sessionsLayerRef = useRef<HTMLDivElement | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [panelSize, setPanelSize] = useState<DockPanelSize>(() =>
    clampDockSize(loadDockSize() ?? getDefaultDockSize())
  );
  const panelSizeRef = useRef(panelSize);
  const resizeStateRef = useRef<DockResizeState | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const pendingResizeSizeRef = useRef<DockPanelSize | null>(null);
  const [isResizing, setIsResizing] = useState(false);
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
  });

  const assistantLoadingMetaByIndex = useMemo(() => {
    const meta = new Map<number, { contextText: string; userTurnCountBefore: number }>();
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

  useEffect(() => {
    panelSizeRef.current = panelSize;
    applyPanelSizeToDom(panelSize);
  }, [panelSize]);

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
  }, [isOpen, panelSize.width, panelSize.height, isResizing]);

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
    const restored = clampDockSize(loadDockSize() ?? getDefaultDockSize());
    setPanelSize(restored);
    panelSizeRef.current = restored;
    applyPanelSizeToDom(restored);
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
      setPanelSize((prev) => {
        const clamped = clampDockSize(prev);
        panelSizeRef.current = clamped;
        return clamped;
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      let nextWidth = state.startWidth;
      let nextHeight = state.startHeight;

      if (state.edge === "left" || state.edge === "corner") {
        nextWidth = state.startWidth + (state.startX - event.clientX);
      }
      if (state.edge === "top" || state.edge === "corner") {
        nextHeight = state.startHeight + (state.startY - event.clientY);
      }

      const clamped = clampDockSize({ width: nextWidth, height: nextHeight });
      panelSizeRef.current = clamped;
      pendingResizeSizeRef.current = clamped;

      if (resizeRafRef.current !== null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const nextSize = pendingResizeSizeRef.current;
        if (!nextSize) return;
        applyPanelSizeToDom(nextSize);
      });
    };

    const stopResize = () => {
      if (!resizeStateRef.current) return;
      resizeStateRef.current = null;
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
      setIsResizing(false);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
      const committedSize = panelSizeRef.current;
      applyPanelSizeToDom(committedSize);
      setPanelSize(committedSize);
      saveDockSize(committedSize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      pendingResizeSizeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isOpen) return;
    resizeStateRef.current = null;
    if (resizeRafRef.current !== null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    pendingResizeSizeRef.current = null;
    setIsResizing(false);
    document.body.style.removeProperty("user-select");
    document.body.style.removeProperty("cursor");
  }, [isOpen]);

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
    setShowResizeHint(false);
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: panelSizeRef.current.width,
      startHeight: panelSizeRef.current.height,
    };
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      edge === "left" ? "ew-resize" : edge === "top" ? "ns-resize" : "nwse-resize";
  };

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
      className={`absolute bottom-0 left-1/2 z-10 isolate flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] will-change-[transform,opacity] transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:left-auto sm:right-0 sm:translate-x-0 ${
        isOpen
          ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-4 scale-95 opacity-0 pointer-events-none"
      } ${isResizing ? "select-none transition-none" : ""}`}
      style={{
        width: `${(isResizing ? panelSizeRef.current : panelSize).width}px`,
        height: `${(isResizing ? panelSizeRef.current : panelSize).height}px`,
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
        onPointerDown={(event) => startResize(event, "top")}
        className="absolute left-0 -top-1 z-40 hidden h-3 w-full cursor-ns-resize touch-none sm:block"
      />
      <div
        aria-hidden
        onPointerDown={(event) => startResize(event, "corner")}
        className="absolute -left-1 -top-1 z-50 hidden h-4 w-4 cursor-nwse-resize touch-none sm:block"
      />
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5">
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
            onClick={() => router.push("/chat")}
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
                          ? assistantLoadingMetaByIndex.get(index)?.contextText || ""
                          : ""
                      }
                      loadingUserTurnCount={
                        message.role === "assistant"
                          ? assistantLoadingMetaByIndex.get(index)?.userTurnCountBefore ?? 0
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

        <div
          ref={sessionsLayerRef}
          className={`absolute inset-0 z-[80] transition-opacity duration-200 ${
            sessionsOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={closeSessionsPanel}
            className="absolute inset-0 z-[81] bg-slate-900/20"
            aria-label="대화목록 닫기"
          />

          <div
            className={`absolute inset-y-0 left-0 z-[82] w-[min(78%,260px)] border-r border-slate-200 bg-white transition-transform duration-200 ${
              sessionsOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">대화 목록</p>
              <button
                type="button"
                onClick={closeSessionsPanel}
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
                  closeSessionsPanel();
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
                        closeSessionsPanel();
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
        </div>
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
