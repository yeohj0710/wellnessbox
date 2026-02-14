"use client";

import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { enqueueRoutePrefetch } from "@/lib/navigation/prefetch";

type RouterPrefetchLike = {
  prefetch: (href: string) => void | Promise<void>;
};

type UsePrefetchOnIntentOptions = {
  href: string;
  router: RouterPrefetchLike;
  enabled?: boolean;
  delayMs?: number;
};

function supportsHoverPointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function usePrefetchOnIntent({
  href,
  router,
  enabled = true,
  delayMs = 80,
}: UsePrefetchOnIntentOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const runPrefetch = useCallback(() => {
    if (!enabled) return;
    enqueueRoutePrefetch(router, href);
  }, [enabled, href, router]);

  const schedulePrefetch = useCallback(() => {
    if (!enabled) return;
    clearPending();
    timeoutRef.current = setTimeout(() => {
      runPrefetch();
      timeoutRef.current = null;
    }, delayMs);
  }, [clearPending, delayMs, enabled, runPrefetch]);

  const onPointerEnter = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.pointerType && event.pointerType !== "mouse") return;
      if (!supportsHoverPointer()) return;
      schedulePrefetch();
    },
    [enabled, schedulePrefetch]
  );

  const onMouseEnter = useCallback((_event: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    if (!supportsHoverPointer()) return;
    schedulePrefetch();
  }, [enabled, schedulePrefetch]);

  const onFocus = useCallback((_event: FocusEvent<HTMLElement>) => {
    if (!enabled) return;
    runPrefetch();
  }, [enabled, runPrefetch]);

  useEffect(() => {
    clearPending();
    return clearPending;
  }, [clearPending, href]);

  return {
    onPointerEnter,
    onMouseEnter,
    onFocus,
    onMouseLeave: clearPending,
    onBlur: clearPending,
  };
}
