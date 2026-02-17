"use client";

import { useEffect, useMemo, useState } from "react";

const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";
const DESKTOP_MIN_WIDTH = 1024;
const BAR_MAX_WIDTH = 640;
const COLLISION_GAP = 16;
const MIN_LEFT_INSET = 12;

type ChatDockLayoutDetail = {
  open: boolean;
  left: number;
  right: number;
  width: number;
  height: number;
};

function isLayoutDetail(value: unknown): value is ChatDockLayoutDetail {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.open === "boolean" &&
    typeof row.left === "number" &&
    typeof row.right === "number" &&
    typeof row.width === "number" &&
    typeof row.height === "number"
  );
}

function getViewportWidth() {
  return typeof window === "undefined" ? 0 : window.innerWidth;
}

export function useFooterCartDockAvoidance() {
  const [dockLayout, setDockLayout] = useState<ChatDockLayoutDetail | null>(null);
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [shiftX, setShiftX] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onDockLayout = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isLayoutDetail(detail)) return;
      setDockLayout(detail);
    };

    window.addEventListener(CHAT_DOCK_LAYOUT_EVENT, onDockLayout as EventListener);
    return () =>
      window.removeEventListener(
        CHAT_DOCK_LAYOUT_EVENT,
        onDockLayout as EventListener
      );
  }, []);

  useEffect(() => {
    if (!dockLayout?.open || viewportWidth < DESKTOP_MIN_WIDTH) {
      setShiftX(0);
      return;
    }

    const barWidth = Math.min(viewportWidth, BAR_MAX_WIDTH);
    const barLeft = Math.max(0, (viewportWidth - barWidth) / 2);
    const barRight = barLeft + barWidth;
    const overlap = barRight + COLLISION_GAP - Math.max(0, dockLayout.left);

    if (overlap <= 0) {
      setShiftX(0);
      return;
    }

    // Keep a minimum inset from the left viewport edge even after shifting.
    const minShift = MIN_LEFT_INSET - barLeft;
    setShiftX(Math.max(minShift, -overlap));
  }, [dockLayout, viewportWidth]);

  const shouldHideForMobile = Boolean(
    dockLayout?.open && viewportWidth > 0 && viewportWidth < DESKTOP_MIN_WIDTH
  );

  const style = useMemo(
    () => ({
      transform: shouldHideForMobile
        ? "translate3d(0, 110%, 0)"
        : `translate3d(${shiftX}px, 0, 0)`,
      transition:
        "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
      opacity: shouldHideForMobile ? 0 : 1,
    }),
    [shiftX, shouldHideForMobile]
  );

  return {
    style,
    shouldHideForMobile,
    dockOpen: Boolean(dockLayout?.open),
  };
}

