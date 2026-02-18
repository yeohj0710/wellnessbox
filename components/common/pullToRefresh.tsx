"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD_PX = 80;
const REFRESH_COOLDOWN_MS = 1200;
const HORIZONTAL_GESTURE_MIN_PX = 6;

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator?.maxTouchPoints ?? 0) > 0 ||
    (navigator as any)?.msMaxTouchPoints > 0
  );
}

function getScrollTop() {
  if (typeof document === "undefined") return 0;
  const scrollingElement = document.scrollingElement;
  if (scrollingElement) return scrollingElement.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function isHorizontalScrollArea(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  if (target.closest("[data-horizontal-scroll-area='true']")) {
    return true;
  }

  let node: Element | null = target;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const overflowX = style.overflowX;
      const canScrollX =
        (overflowX === "auto" || overflowX === "scroll") &&
        node.scrollWidth > node.clientWidth + 1;
      if (canScrollX) return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function PullToRefresh() {
  const router = useRouter();
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const ignoreGestureRef = useRef(false);
  const isTrackingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTouchDevice()) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (getScrollTop() > 0) return;

      if (isHorizontalScrollArea(event.target)) {
        ignoreGestureRef.current = true;
        isTrackingRef.current = false;
        startXRef.current = null;
        startYRef.current = null;
        return;
      }

      ignoreGestureRef.current = false;
      startXRef.current = event.touches[0]?.clientX ?? null;
      startYRef.current = event.touches[0]?.clientY ?? null;
      isTrackingRef.current =
        startXRef.current !== null && startYRef.current !== null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (ignoreGestureRef.current) return;
      if (!isTrackingRef.current || isRefreshingRef.current) return;
      if (startYRef.current === null) return;
      if (startXRef.current === null) return;
      if (getScrollTop() > 0) return;
      if (!event.cancelable) return;

      const currentX = event.touches[0]?.clientX ?? 0;
      const currentY = event.touches[0]?.clientY ?? 0;
      const deltaX = currentX - startXRef.current;
      const deltaY = currentY - startYRef.current;

      if (
        Math.abs(deltaX) >= HORIZONTAL_GESTURE_MIN_PX &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        isTrackingRef.current = false;
        startXRef.current = null;
        startYRef.current = null;
        return;
      }

      if (deltaY <= 0) return;

      event.preventDefault();

      if (deltaY >= PULL_THRESHOLD_PX) {
        isRefreshingRef.current = true;
        isTrackingRef.current = false;
        startXRef.current = null;
        startYRef.current = null;

        router.refresh();

        cooldownTimerRef.current = setTimeout(() => {
          isRefreshingRef.current = false;
        }, REFRESH_COOLDOWN_MS);
      }
    };

    const handleTouchEnd = () => {
      ignoreGestureRef.current = false;
      isTrackingRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      } as any);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [router]);

  return null;
}
