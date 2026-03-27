"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import AutoDismissTimerBar from "@/components/common/AutoDismissTimerBar";
import { buildPageAgentContext } from "@/lib/chat/page-agent-context";
import DesktopChatDockPanel from "./DesktopChatDockPanel";
import {
  ROUTE_NUDGE_AUTO_HIDE_MS,
  useDesktopChatDockLauncher,
} from "./useDesktopChatDockLauncher";
import {
  clearDockTriggerOffset,
  type DockTriggerOffset,
} from "./DesktopChatDock.layout.storage";

const DOCK_NUDGE_TEXT_MAP: Record<string, string> = {
  "agent assist": "AI 에이전트",
  "home product browsing": "홈 상품 탐색",
  "show me products for a 7-day package.": "7일치 패키지 상품 보여줘",
  "show me products for a 7-day package": "7일치 패키지 상품 보여줘",
  "scroll to the home product section.": "홈 상품 섹션으로 이동해줘.",
  "scroll to the home product section": "홈 상품 섹션으로 이동해줘.",
  "open cart and continue checkout.": "장바구니 열고 결제 계속 진행해줘.",
  "open cart and continue checkout": "장바구니 열고 결제 계속 진행해줘.",
};

const TRIGGER_DRAG_THRESHOLD_PX = 6;
const TRIGGER_VIEWPORT_MARGIN_PX = 12;
const MOBILE_TRIGGER_WIDTH_PX = 56;
const MOBILE_TRIGGER_HEIGHT_PX = 56;
const DESKTOP_TRIGGER_WIDTH_PX = 172;
const DESKTOP_TRIGGER_HEIGHT_PX = 64;
const MOBILE_TRIGGER_RIGHT_OFFSET_PX = 12;
const DESKTOP_TRIGGER_RIGHT_OFFSET_PX = 20;

type TriggerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  dragging: boolean;
};

function localizeDockNudgeText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return DOCK_NUDGE_TEXT_MAP[trimmed.toLowerCase()] || trimmed;
}

function clampDockTriggerOffset(input: {
  offset: DockTriggerOffset;
  viewportWidth: number;
  viewportHeight: number;
  triggerWidth: number;
  triggerHeight: number;
  rightOffsetPx: number;
  bottomOffsetPx: number;
}) {
  const {
    offset,
    viewportWidth,
    viewportHeight,
    triggerWidth,
    triggerHeight,
    rightOffsetPx,
    bottomOffsetPx,
  } = input;

  const baseLeft = viewportWidth - rightOffsetPx - triggerWidth;
  const baseTop = viewportHeight - bottomOffsetPx - triggerHeight;
  const minLeft = TRIGGER_VIEWPORT_MARGIN_PX;
  const maxLeft = Math.max(
    TRIGGER_VIEWPORT_MARGIN_PX,
    viewportWidth - triggerWidth - TRIGGER_VIEWPORT_MARGIN_PX
  );
  const minTop = TRIGGER_VIEWPORT_MARGIN_PX;
  const maxTop = Math.max(
    TRIGGER_VIEWPORT_MARGIN_PX,
    viewportHeight - triggerHeight - bottomOffsetPx
  );

  const left = Math.min(maxLeft, Math.max(minLeft, baseLeft + offset.x));
  const top = Math.min(maxTop, Math.max(minTop, baseTop + offset.y));

  return {
    x: Math.round(left - baseLeft),
    y: Math.round(top - baseTop),
  } satisfies DockTriggerOffset;
}

function areDockTriggerOffsetsEqual(
  left: DockTriggerOffset,
  right: DockTriggerOffset
) {
  return left.x === right.x && left.y === right.y;
}

export default function DesktopChatDock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<TriggerDragState | null>(null);
  const triggerHintTimerRef = useRef<number | null>(null);
  const previousIsOpenRef = useRef(false);
  const suppressOpenRef = useRef(false);
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
  const routeKey = pageAgentContext?.routeKey || "generic";
  const localizedRouteTitle = localizeDockNudgeText(
    pageAgentContext?.title || "현재 페이지"
  );
  const nudgePrompts = (pageAgentContext?.suggestedPrompts || [])
    .map((prompt) => localizeDockNudgeText(prompt))
    .map((prompt) => prompt.trim())
    .filter(Boolean)
    .slice(0, 2);
  const {
    isOpen,
    hasBooted,
    pendingOpen,
    isMobileViewport,
    showRouteNudge,
    triggerBottomStyle,
    triggerBottomOffsetPx,
    requestOpenDock,
    closeDock,
    dismissRouteNudge,
    openDockWithPrompt,
  } = useDesktopChatDockLauncher({
    isChatRoute,
    routeKey,
    hasNudgePrompts: nudgePrompts.length > 0,
  });
  const [triggerOffset, setTriggerOffset] = useState<DockTriggerOffset>({
    x: 0,
    y: 0,
  });
  const [isTriggerDragging, setIsTriggerDragging] = useState(false);
  const [showTriggerHint, setShowTriggerHint] = useState(false);
  const triggerOffsetRef = useRef(triggerOffset);
  const isMobileViewportRef = useRef(isMobileViewport);
  const triggerBottomOffsetPxRef = useRef(triggerBottomOffsetPx);

  useEffect(() => {
    isMobileViewportRef.current = isMobileViewport;
    triggerBottomOffsetPxRef.current = triggerBottomOffsetPx;
  }, [isMobileViewport, triggerBottomOffsetPx]);

  const clampAndStoreTriggerOffset = useCallback(
    (nextOffset: DockTriggerOffset) => {
      if (typeof window === "undefined") {
        if (!areDockTriggerOffsetsEqual(triggerOffsetRef.current, nextOffset)) {
          triggerOffsetRef.current = nextOffset;
          setTriggerOffset(nextOffset);
        }
        return triggerOffsetRef.current;
      }

      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const triggerWidth = Math.round(
        triggerRect?.width ??
          (isMobileViewportRef.current
            ? MOBILE_TRIGGER_WIDTH_PX
            : DESKTOP_TRIGGER_WIDTH_PX)
      );
      const triggerHeight = Math.round(
        triggerRect?.height ??
          (isMobileViewportRef.current
            ? MOBILE_TRIGGER_HEIGHT_PX
            : DESKTOP_TRIGGER_HEIGHT_PX)
      );
      const clamped = clampDockTriggerOffset({
        offset: nextOffset,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        triggerWidth,
        triggerHeight,
        rightOffsetPx: isMobileViewportRef.current
          ? MOBILE_TRIGGER_RIGHT_OFFSET_PX
          : DESKTOP_TRIGGER_RIGHT_OFFSET_PX,
        bottomOffsetPx: triggerBottomOffsetPxRef.current,
      });

      if (!areDockTriggerOffsetsEqual(triggerOffsetRef.current, clamped)) {
        triggerOffsetRef.current = clamped;
        setTriggerOffset(clamped);
      }
      return triggerOffsetRef.current;
    },
    []
  );

  const showTriggerHintBriefly = useCallback((durationMs = 1200) => {
    if (typeof window === "undefined") return;
    setShowTriggerHint(true);
    if (triggerHintTimerRef.current !== null) {
      window.clearTimeout(triggerHintTimerRef.current);
    }
    triggerHintTimerRef.current = window.setTimeout(() => {
      setShowTriggerHint(false);
      triggerHintTimerRef.current = null;
    }, durationMs);
  }, []);

  const hideTriggerHint = useCallback(() => {
    setShowTriggerHint(false);
    if (typeof window === "undefined") return;
    if (triggerHintTimerRef.current !== null) {
      window.clearTimeout(triggerHintTimerRef.current);
      triggerHintTimerRef.current = null;
    }
  }, []);

  const resetTriggerOffsetToDefault = useCallback(
    () => {
      clampAndStoreTriggerOffset({ x: 0, y: 0 });
    },
    [clampAndStoreTriggerOffset]
  );

  useEffect(() => {
    clearDockTriggerOffset();
    resetTriggerOffsetToDefault();
  }, [resetTriggerOffsetToDefault]);

  useEffect(() => {
    resetTriggerOffsetToDefault();
  }, [isMobileViewport, resetTriggerOffsetToDefault]);

  useEffect(() => {
    clampAndStoreTriggerOffset(triggerOffsetRef.current);
  }, [clampAndStoreTriggerOffset, triggerBottomOffsetPx]);

  const handleTriggerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (isOpen || pendingOpen) return;
      if (!event.isPrimary) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      suppressOpenRef.current = false;
      if (event.pointerType !== "mouse") {
        showTriggerHintBriefly();
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: triggerOffset.x,
        startOffsetY: triggerOffset.y,
        dragging: false,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore browsers that fail pointer capture during touch transitions
      }
    },
    [isOpen, pendingOpen, showTriggerHintBriefly, triggerOffset.x, triggerOffset.y]
  );

  const finishTriggerDrag = useCallback(
    (pointerId: number | null) => {
      const state = dragStateRef.current;
      if (!state) return;
      if (pointerId !== null && state.pointerId !== pointerId) return;

      if (state.dragging) {
        suppressOpenRef.current = true;
        hideTriggerHint();
      }

      dragStateRef.current = null;
      setIsTriggerDragging(false);
      if (pointerId !== null) {
        try {
          triggerRef.current?.releasePointerCapture(pointerId);
        } catch {
          // ignore browsers that already released pointer capture
        }
      }
    },
    [hideTriggerHint]
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      if (!state.dragging) {
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < TRIGGER_DRAG_THRESHOLD_PX) return;
        state.dragging = true;
        setIsTriggerDragging(true);
        hideTriggerHint();
      }

      event.preventDefault();
      clampAndStoreTriggerOffset({
        x: state.startOffsetX + deltaX,
        y: state.startOffsetY + deltaY,
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishTriggerDrag(event.pointerId);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finishTriggerDrag(event.pointerId);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [clampAndStoreTriggerOffset, finishTriggerDrag, hideTriggerHint]);

  useEffect(() => {
    if (!isOpen && !pendingOpen) return;
    finishTriggerDrag(null);
  }, [finishTriggerDrag, isOpen, pendingOpen]);

  useEffect(() => {
    if (previousIsOpenRef.current && !isOpen) {
      resetTriggerOffsetToDefault();
      hideTriggerHint();
    }
    previousIsOpenRef.current = isOpen;
  }, [hideTriggerHint, isOpen, resetTriggerOffsetToDefault]);

  useEffect(() => {
    if (isOpen || pendingOpen) return;
    resetTriggerOffsetToDefault();
  }, [pathname, isOpen, pendingOpen, resetTriggerOffsetToDefault]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && triggerHintTimerRef.current !== null) {
        window.clearTimeout(triggerHintTimerRef.current);
      }
    };
  }, []);

  const handleTriggerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (suppressOpenRef.current) {
        suppressOpenRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      requestOpenDock();
    },
    [requestOpenDock]
  );

  if (isChatRoute) {
    return null;
  }

  return (
    <div
      className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-[58] flex justify-end px-3 sm:bottom-7 sm:left-auto sm:right-5 sm:px-0"
      style={triggerBottomStyle ? { bottom: triggerBottomStyle } : undefined}
    >
      <div
        className="pointer-events-none relative ml-auto"
        style={{
          transform: `translate3d(${triggerOffset.x}px, ${triggerOffset.y}px, 0)`,
        }}
      >
        {!isMobileViewport && showRouteNudge ? (
          <div className="pointer-events-auto absolute bottom-[calc(100%+10px)] right-0 w-[min(88vw,330px)] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  AI 에이전트
                </p>
                <p className="mt-0.5 text-[14px] leading-5 text-slate-700">
                  {localizedRouteTitle}에서 바로 실행할 수 있어요
                </p>
              </div>
              <button
                type="button"
                onClick={dismissRouteNudge}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
                aria-label="현재 안내 닫기"
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
                  className="max-w-full truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[12px] text-sky-700 hover:bg-sky-100"
                  title={prompt}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <AutoDismissTimerBar
              durationMs={ROUTE_NUDGE_AUTO_HIDE_MS}
              className="mt-2.5"
              label="안내가 잠시 뒤 사라집니다"
              labelClassName="text-slate-500"
              countdownClassName="text-slate-500"
              trackClassName="bg-slate-100"
              barClassName="bg-gradient-to-r from-sky-400 to-cyan-400"
            />
          </div>
        ) : null}

        <button
          ref={triggerRef}
          type="button"
          onPointerDown={handleTriggerPointerDown}
          onPointerEnter={() => showTriggerHintBriefly(1400)}
          onPointerLeave={hideTriggerHint}
          onBlur={hideTriggerHint}
          onClick={handleTriggerClick}
          className={`group relative z-20 ml-auto flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-[transform,opacity,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-16 sm:w-auto sm:gap-2.5 sm:px-5 sm:pr-6 lg:gap-3 lg:px-6 ${
            isTriggerDragging
              ? "cursor-grabbing scale-[1.03] shadow-[0_18px_42px_rgba(14,165,233,0.24)] duration-75"
              : "cursor-grab duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.22)]"
          } ${
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
          <span
            className={`pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_12px_24px_rgba(15,23,42,0.22)] transition-all duration-200 sm:inline-flex ${
              showTriggerHint && !isOpen && !pendingOpen && !isTriggerDragging
                ? "-translate-y-1 opacity-100"
                : "translate-y-1 opacity-0"
            }`}
          >
            드래그해서 이동
          </span>
        </button>
      </div>

      {hasBooted ? (
        <DesktopChatDockPanel
          isOpen={isOpen}
          onClose={closeDock}
          pageAgentContext={pageAgentContext}
          fromPath={contextFromPath}
        />
      ) : null}
    </div>
  );
}
