"use client";

import { useEffect, useMemo, useState } from "react";

const CHAT_DOCK_LAYOUT_EVENT = "wb:chat-dock-layout";
const DESKTOP_MIN_WIDTH = 1024;

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

  const shouldHideForMobile = Boolean(
    dockLayout?.open && viewportWidth > 0 && viewportWidth < DESKTOP_MIN_WIDTH
  );

  const style = useMemo(
    () => ({
      transform: shouldHideForMobile
        ? "translate3d(0, 110%, 0)"
        : "translate3d(0, 0, 0)",
      transition:
        "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
      opacity: shouldHideForMobile ? 0 : 1,
    }),
    [shouldHideForMobile]
  );

  return {
    style,
    shouldHideForMobile,
    dockOpen: Boolean(dockLayout?.open),
  };
}
