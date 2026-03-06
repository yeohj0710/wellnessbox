"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveTopBarDrawerMode } from "./topBar.layout";

type UseTopBarDrawerModeInput = {
  onDrawerModeChange?: (enabled: boolean) => void;
  layoutDependencyKey: string;
};

export function useTopBarDrawerMode({
  onDrawerModeChange,
  layoutDependencyKey,
}: UseTopBarDrawerModeInput) {
  const rowRef = useRef<HTMLDivElement>(null);
  const leftBrandRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const rightActionsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isDrawerMode, setIsDrawerMode] = useState(true);

  const computeDrawerMode = useCallback(() => {
    if (typeof window === "undefined") return true;

    const rowNode = rowRef.current;
    const brandNode = leftBrandRef.current;
    const navNode = navRef.current;
    const rightNode = rightActionsRef.current;
    if (!rowNode || !brandNode || !navNode || !rightNode) return true;

    return resolveTopBarDrawerMode({
      viewportWidth: window.innerWidth,
      rowClientWidth: rowNode.clientWidth,
      rowScrollWidth: rowNode.scrollWidth,
      brandWidth: brandNode.getBoundingClientRect().width,
      rightActionsWidth: rightNode.getBoundingClientRect().width,
      navRequiredWidth: navNode.scrollWidth,
    });
  }, []);

  const scheduleDrawerModeUpdate = useCallback(() => {
    if (typeof window === "undefined") return;
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setIsDrawerMode(computeDrawerMode());
    });
  }, [computeDrawerMode]);

  useEffect(() => {
    onDrawerModeChange?.(isDrawerMode);
  }, [isDrawerMode, onDrawerModeChange]);

  useEffect(() => {
    scheduleDrawerModeUpdate();
  }, [layoutDependencyKey, scheduleDrawerModeUpdate]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      scheduleDrawerModeUpdate();
    });

    const nodes = [
      rowRef.current,
      leftBrandRef.current,
      navRef.current,
      rightActionsRef.current,
    ];
    for (const node of nodes) {
      if (node) resizeObserver.observe(node);
    }

    window.addEventListener("resize", scheduleDrawerModeUpdate);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleDrawerModeUpdate);
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleDrawerModeUpdate]);

  return {
    isDrawerMode,
    rowRef,
    leftBrandRef,
    navRef,
    rightActionsRef,
  };
}
