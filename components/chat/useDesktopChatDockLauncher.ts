"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DOCK_NUDGE_AUTO_HIDE_COOLDOWN_MS,
  DOCK_NUDGE_MANUAL_HIDE_COOLDOWN_MS,
  FOOTER_CART_BAR_LAYOUT_EVENT,
  MOBILE_TRIGGER_BREAKPOINT,
  MOBILE_TRIGGER_EXTRA_GAP,
  dismissDockNudge,
  emitChatDockLayout,
  isDockNudgeDismissed,
  isDockNudgeGloballySuppressed,
  isFooterCartBarLayoutDetail,
  queueDockPrompt,
  readFooterCartBarOffsetPx,
  suppressDockNudgeGlobally,
} from "./DesktopChatDock.layout";

const ROUTE_NUDGE_AUTO_HIDE_MS = 4800;

type UseDesktopChatDockLauncherOptions = {
  isChatRoute: boolean;
  routeKey: string;
  hasNudgePrompts: boolean;
};

type UseDesktopChatDockLauncherResult = {
  isOpen: boolean;
  hasBooted: boolean;
  pendingOpen: boolean;
  isMobileViewport: boolean;
  showRouteNudge: boolean;
  triggerBottomStyle: string | undefined;
  requestOpenDock: () => void;
  closeDock: () => void;
  dismissRouteNudge: () => void;
  openDockWithPrompt: (prompt: string) => void;
};

function emitClosedDockLayout() {
  emitChatDockLayout({
    open: false,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  });
}

export function useDesktopChatDockLauncher({
  isChatRoute,
  routeKey,
  hasNudgePrompts,
}: UseDesktopChatDockLauncherOptions): UseDesktopChatDockLauncherResult {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [mobileFooterCartBarHeight, setMobileFooterCartBarHeight] = useState(
    () => readFooterCartBarOffsetPx()
  );
  const [showRouteNudge, setShowRouteNudge] = useState(false);

  const hasViewportMeasurement = viewportWidth > 0;
  const isMobileViewport =
    hasViewportMeasurement && viewportWidth < MOBILE_TRIGGER_BREAKPOINT;
  const triggerBottomStyle = isMobileViewport
    ? `calc(max(24px, env(safe-area-inset-bottom)) + ${mobileFooterCartBarHeight}px)`
    : undefined;

  const requestOpenDock = useCallback(() => {
    if (isChatRoute) return;
    if (hasBooted) {
      setPendingOpen(false);
      setIsOpen(true);
      return;
    }
    setPendingOpen(true);
    setHasBooted(true);
  }, [hasBooted, isChatRoute]);

  const closeDock = useCallback(() => {
    setPendingOpen(false);
    setIsOpen(false);
    emitClosedDockLayout();
  }, []);

  useEffect(() => {
    if (!pendingOpen) return;
    if (!hasBooted) return;
    if (isChatRoute) return;
    setIsOpen(true);
    setPendingOpen(false);
  }, [hasBooted, isChatRoute, pendingOpen]);

  useEffect(() => {
    if (
      isChatRoute ||
      isOpen ||
      pendingOpen ||
      !hasNudgePrompts ||
      !hasViewportMeasurement ||
      isMobileViewport
    ) {
      setShowRouteNudge(false);
      return;
    }
    const routeDismissed = isDockNudgeDismissed(routeKey);
    const globallySuppressed = isDockNudgeGloballySuppressed();
    setShowRouteNudge(!routeDismissed && !globallySuppressed);
  }, [
    hasNudgePrompts,
    hasViewportMeasurement,
    isChatRoute,
    isMobileViewport,
    isOpen,
    pendingOpen,
    routeKey,
  ]);

  useEffect(() => {
    if (isMobileViewport || !showRouteNudge) return;
    const timer = window.setTimeout(() => {
      suppressDockNudgeGlobally(DOCK_NUDGE_AUTO_HIDE_COOLDOWN_MS);
      setShowRouteNudge(false);
    }, ROUTE_NUDGE_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [isMobileViewport, showRouteNudge]);

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
        closeDock();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDock, isChatRoute, isOpen]);

  useEffect(() => {
    if (!isChatRoute) return;
    closeDock();
  }, [closeDock, isChatRoute]);

  const dismissRouteNudge = useCallback(() => {
    dismissDockNudge(routeKey);
    suppressDockNudgeGlobally(DOCK_NUDGE_MANUAL_HIDE_COOLDOWN_MS);
    setShowRouteNudge(false);
  }, [routeKey]);

  const openDockWithPrompt = useCallback(
    (prompt: string) => {
      queueDockPrompt(prompt);
      dismissDockNudge(routeKey);
      suppressDockNudgeGlobally(DOCK_NUDGE_AUTO_HIDE_COOLDOWN_MS);
      setShowRouteNudge(false);
      requestOpenDock();
    },
    [requestOpenDock, routeKey]
  );

  useEffect(() => {
    const handleCloseDock = () => closeDock();
    const handleOpenDock = () => requestOpenDock();
    window.addEventListener("wb:chat-close-dock", handleCloseDock);
    window.addEventListener("wb:chat-open-dock", handleOpenDock);
    window.addEventListener("openCart", handleCloseDock);
    return () => {
      window.removeEventListener("wb:chat-close-dock", handleCloseDock);
      window.removeEventListener("wb:chat-open-dock", handleOpenDock);
      window.removeEventListener("openCart", handleCloseDock);
    };
  }, [closeDock, requestOpenDock]);

  return {
    isOpen,
    hasBooted,
    pendingOpen,
    isMobileViewport,
    showRouteNudge,
    triggerBottomStyle,
    requestOpenDock,
    closeDock,
    dismissRouteNudge,
    openDockWithPrompt,
  };
}
