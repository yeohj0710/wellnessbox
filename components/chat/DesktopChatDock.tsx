"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { buildPageAgentContext } from "@/lib/chat/page-agent-context";
import {
  FOOTER_CART_BAR_LAYOUT_EVENT,
  MOBILE_TRIGGER_BREAKPOINT,
  MOBILE_TRIGGER_EXTRA_GAP,
  dismissDockNudge,
  emitChatDockLayout,
  isDockNudgeDismissed,
  isFooterCartBarLayoutDetail,
  queueDockPrompt,
  readFooterCartBarOffsetPx,
} from "./DesktopChatDock.layout";
import DesktopChatDockPanel from "./DesktopChatDockPanel";
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

function localizeDockNudgeText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return DOCK_NUDGE_TEXT_MAP[trimmed.toLowerCase()] || trimmed;
}

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
  const contextFromPath = useMemo(() => {
    const basePath = pathname || "/";
    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [pathname, searchParams]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
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
          fromPath={contextFromPath}
        />
      )}
    </div>
  );
}
