"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD_PX = 80;
const REFRESH_COOLDOWN_MS = 1200;

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

export default function PullToRefresh() {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTouchDevice()) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (getScrollTop() > 0) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
      isTrackingRef.current = startYRef.current !== null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTrackingRef.current || isRefreshingRef.current) return;
      if (startYRef.current === null) return;
      if (getScrollTop() > 0) return;
      if (!event.cancelable) return;

      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;

      if (delta <= 0) return;

      event.preventDefault();

      if (delta >= PULL_THRESHOLD_PX) {
        isRefreshingRef.current = true;
        isTrackingRef.current = false;
        startYRef.current = null;

        router.refresh();

        cooldownTimerRef.current = setTimeout(() => {
          isRefreshingRef.current = false;
        }, REFRESH_COOLDOWN_MS);
      }
    };

    const handleTouchEnd = () => {
      isTrackingRef.current = false;
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
