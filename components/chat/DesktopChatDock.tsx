"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { buildPageAgentContext } from "@/lib/chat/page-agent-context";

const VERTICAL_SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);
const SCROLL_EPSILON = 1;
const DOCK_SIZE_STORAGE_KEY = "wb_chat_dock_size_v1";
const DOCK_MIN_WIDTH = 320;
const DOCK_MIN_HEIGHT = 420;
const DOCK_VIEWPORT_GAP_X = 24;
const DOCK_VIEWPORT_GAP_Y = 32;
const DOCK_POSITION_MARGIN = 12;
const DOCK_RESIZE_HINT_DISMISS_KEY = "wb_chat_dock_resize_hint_dismissed_v1";
const DOCK_RESIZE_HINT_WIDTH = 420;
const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";
const FOOTER_CART_BAR_LAYOUT_EVENT = "wb:footer-cart-bar-layout";
const FOOTER_CART_BAR_OFFSET_CSS_VAR = "--wb-footer-cart-bar-offset";
const MOBILE_TRIGGER_BREAKPOINT = 640;
const MOBILE_TRIGGER_EXTRA_GAP = 12;
const PENDING_DOCK_PROMPT_KEY = "wb_chat_dock_pending_prompt_v1";
const DOCK_NUDGE_DISMISS_KEY_PREFIX = "wb_chat_dock_nudge_dismissed_v2:";
const DOCK_POSITION_STORAGE_KEY = "wb_chat_dock_position_v1";
const DOCK_NUDGE_TEXT_MAP: Record<string, string> = {
  "agent assist": "AI 에이전트",
  "home product browsing": "홈 상품 탐색",
  "show me products for a 7-day package.": "7일 패키지 상품 보여줘.",
  "show me products for a 7-day package": "7일 패키지 상품 보여줘.",
  "scroll to the home product section.": "홈 상품 섹션으로 이동해줘.",
  "scroll to the home product section": "홈 상품 섹션으로 이동해줘.",
  "open cart and continue checkout.": "장바구니 열고 결제 계속 진행해줘.",
  "open cart and continue checkout": "장바구니 열고 결제 계속 진행해줘.",
};

type DockPanelSize = {
  width: number;
  height: number;
};

type DockResizeEdge =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type DockResizeState = {
  edge: DockResizeEdge;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
};

type DockPanelPosition = {
  left: number;
  top: number;
};

type DockDragState = {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

type DocumentScrollLockSnapshot = {
  bodyOverflow: string;
  bodyTouchAction: string;
  bodyOverscrollBehavior: string;
  bodyUserSelect: string;
  bodyCursor: string;
  rootOverflow: string;
  rootTouchAction: string;
  rootOverscrollBehavior: string;
};

type ChatDockLayoutDetail = {
  open: boolean;
  left: number;
  right: number;
  width: number;
  height: number;
};

type FooterCartBarLayoutDetail = {
  visible: boolean;
  height: number;
};

function emitChatDockLayout(detail: ChatDockLayoutDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_DOCK_LAYOUT_EVENT, { detail }));
}

function isFooterCartBarLayoutDetail(
  value: unknown
): value is FooterCartBarLayoutDetail {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.visible === "boolean" && typeof row.height === "number";
}

function readFooterCartBarOffsetPx() {
  if (typeof window === "undefined") return 0;
  const raw =
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(FOOTER_CART_BAR_OFFSET_CSS_VAR) || "0";
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function queueDockPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  const text = prompt.trim();
  if (!text) return;
  try {
    window.sessionStorage.setItem(PENDING_DOCK_PROMPT_KEY, text);
  } catch {
    // ignore storage failures
  }
}

function consumeDockPrompt() {
  if (typeof window === "undefined") return "";
  try {
    const text = (
      window.sessionStorage.getItem(PENDING_DOCK_PROMPT_KEY) || ""
    ).trim();
    if (!text) return "";
    window.sessionStorage.removeItem(PENDING_DOCK_PROMPT_KEY);
    return text;
  } catch {
    return "";
  }
}

function isDockNudgeDismissed(routeKey: string) {
  if (typeof window === "undefined") return false;
  const key = `${DOCK_NUDGE_DISMISS_KEY_PREFIX}${routeKey || "generic"}`;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function dismissDockNudge(routeKey: string) {
  if (typeof window === "undefined") return;
  const key = `${DOCK_NUDGE_DISMISS_KEY_PREFIX}${routeKey || "generic"}`;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore storage failures
  }
}

function localizeDockNudgeText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return DOCK_NUDGE_TEXT_MAP[trimmed.toLowerCase()] || trimmed;
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

function clampDockPosition(
  position: DockPanelPosition,
  size: DockPanelSize
): DockPanelPosition {
  if (typeof window === "undefined") {
    return position;
  }

  const maxLeft = Math.max(
    DOCK_POSITION_MARGIN,
    window.innerWidth - size.width - DOCK_POSITION_MARGIN
  );
  const maxTop = Math.max(
    DOCK_POSITION_MARGIN,
    window.innerHeight - size.height - DOCK_POSITION_MARGIN
  );

  return {
    left: Math.round(
      Math.min(maxLeft, Math.max(DOCK_POSITION_MARGIN, position.left))
    ),
    top: Math.round(
      Math.min(maxTop, Math.max(DOCK_POSITION_MARGIN, position.top))
    ),
  };
}

function getDefaultDockPosition(size: DockPanelSize): DockPanelPosition {
  if (typeof window === "undefined") {
    return { left: DOCK_POSITION_MARGIN, top: DOCK_POSITION_MARGIN };
  }

  return clampDockPosition(
    {
      left: window.innerWidth - size.width - 20,
      top: window.innerHeight - size.height - 24,
    },
    size
  );
}

function loadDockPosition(): DockPanelPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOCK_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DockPanelPosition> | null;
    if (!parsed) return null;
    const left = Number(parsed.left);
    const top = Number(parsed.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return { left, top };
  } catch {
    return null;
  }
}

function saveDockPosition(position: DockPanelPosition) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DOCK_POSITION_STORAGE_KEY,
      JSON.stringify(position)
    );
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

function edgeIncludesLeft(edge: DockResizeEdge) {
  return edge === "left" || edge === "top-left" || edge === "bottom-left";
}

function edgeIncludesRight(edge: DockResizeEdge) {
  return edge === "right" || edge === "top-right" || edge === "bottom-right";
}

function edgeIncludesTop(edge: DockResizeEdge) {
  return edge === "top" || edge === "top-left" || edge === "top-right";
}

function edgeIncludesBottom(edge: DockResizeEdge) {
  return edge === "bottom" || edge === "bottom-left" || edge === "bottom-right";
}

function resizeCursorForEdge(edge: DockResizeEdge) {
  if (edge === "left" || edge === "right") return "ew-resize";
  if (edge === "top" || edge === "bottom") return "ns-resize";
  if (edge === "top-right" || edge === "bottom-left") return "nesw-resize";
  return "nwse-resize";
}

type DockPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  pageAgentContext: ReturnType<typeof buildPageAgentContext>;
};

export default function DesktopChatDock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChatRoute = pathname?.startsWith("/chat") ?? false;
  const pageAgentContext = useMemo(
    () =>
      buildPageAgentContext({
        pathname: pathname || "/",
        searchParams,
      }),
    [pathname, searchParams]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const [mobileFooterCartBarHeight, setMobileFooterCartBarHeight] = useState(
    () => readFooterCartBarOffsetPx()
  );
  const [showRouteNudge, setShowRouteNudge] = useState(false);
  const routeKey = pageAgentContext?.routeKey || "generic";
  const localizedRouteTitle = localizeDockNudgeText(
    pageAgentContext?.title || "현재 페이지"
  );
  const nudgePrompts = (pageAgentContext?.suggestedPrompts || [])
    .map((prompt) => localizeDockNudgeText(prompt))
    .map((prompt) => prompt.trim())
    .filter(Boolean)
    .slice(0, 2);

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
    if (isChatRoute || isOpen || pendingOpen || nudgePrompts.length === 0) {
      setShowRouteNudge(false);
      return;
    }
    setShowRouteNudge(!isDockNudgeDismissed(routeKey));
  }, [isChatRoute, isOpen, nudgePrompts.length, pendingOpen, routeKey]);

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
    if (typeof window === "undefined") return;
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      setMobileFooterCartBarHeight(readFooterCartBarOffsetPx());
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFooterLayout = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isFooterCartBarLayoutDetail(detail)) return;
      const nextHeight =
        detail.visible && Number.isFinite(detail.height)
          ? Math.max(0, Math.round(detail.height)) + MOBILE_TRIGGER_EXTRA_GAP
          : 0;
      setMobileFooterCartBarHeight(nextHeight);
    };
    window.addEventListener(
      FOOTER_CART_BAR_LAYOUT_EVENT,
      onFooterLayout as EventListener
    );
    return () => {
      window.removeEventListener(
        FOOTER_CART_BAR_LAYOUT_EVENT,
        onFooterLayout as EventListener
      );
    };
  }, []);

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

  const handleDismissRouteNudge = useCallback(() => {
    dismissDockNudge(routeKey);
    setShowRouteNudge(false);
  }, [routeKey]);

  const openDockWithPrompt = useCallback(
    (prompt: string) => {
      queueDockPrompt(prompt);
      setShowRouteNudge(false);
      requestOpenDock();
    },
    [requestOpenDock]
  );

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

  const isMobileViewport = viewportWidth > 0 && viewportWidth < MOBILE_TRIGGER_BREAKPOINT;
  const mobileTriggerOffset = isMobileViewport
    ? mobileFooterCartBarHeight
    : 0;
  const triggerBottomStyle = isMobileViewport
    ? `calc(max(24px, env(safe-area-inset-bottom)) + ${mobileTriggerOffset}px)`
    : undefined;

  return (
    <div
      className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-[58] flex justify-end px-3 sm:bottom-7 sm:left-auto sm:right-5 sm:px-0"
      style={
        triggerBottomStyle
          ? { bottom: triggerBottomStyle }
          : undefined
      }
    >
      {showRouteNudge && (
        <div className="pointer-events-auto absolute bottom-[calc(100%+10px)] right-0 w-[min(88vw,330px)] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                AI 에이전트
              </p>
              <p className="mt-0.5 text-[12px] text-slate-700">
                {localizedRouteTitle}에서 바로 실행할 수 있어요.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissRouteNudge}
              className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
              aria-label="도움 패널 닫기"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {nudgePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => openDockWithPrompt(prompt)}
                className="max-w-full truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] text-sky-700 hover:bg-sky-100"
                title={prompt}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

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
          pageAgentContext={pageAgentContext}
        />
      )}
    </div>
  );
}

function DesktopChatDockPanel({
  isOpen,
  onClose,
  pageAgentContext,
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
                  pageAgentContext?.routePath || "dock"
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
                        void handleDelete(
                          session.id,
                          session.title || "새 상담"
                        )
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
