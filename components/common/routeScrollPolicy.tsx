"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasPendingCartScrollRestoreForPath } from "@/lib/client/cart-navigation";

const SCROLL_PRESERVE_PREFIXES = ["/chat", "/agent-playground"];

function isScrollPreservedPath(pathname: string) {
  return SCROLL_PRESERVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function buildPathWithSearch(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function scrollAllKnownRootsToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  const scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const customRoots = document.querySelectorAll<HTMLElement>(
    "[data-route-scroll-root='true']"
  );
  customRoots.forEach((root) => {
    root.scrollTop = 0;
  });
}

function scheduleScrollTopResets() {
  const timers: number[] = [];
  const run = () => scrollAllKnownRootsToTop();

  run();
  requestAnimationFrame(run);
  timers.push(window.setTimeout(run, 0));
  timers.push(window.setTimeout(run, 120));
  timers.push(window.setTimeout(run, 320));
  timers.push(window.setTimeout(run, 720));

  return () => {
    timers.forEach((timerId) => window.clearTimeout(timerId));
  };
}

export default function RouteScrollPolicy() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const pathWithSearch = buildPathWithSearch(pathname, search);
  const previousPathnameRef = useRef<string | null>(null);
  const previousPathWithSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const previousPathWithSearch = previousPathWithSearchRef.current;
    previousPathnameRef.current = pathname;
    previousPathWithSearchRef.current = pathWithSearch;

    if (!previousPathname || !previousPathWithSearch) return;
    if (previousPathWithSearch === pathWithSearch) return;
    if (typeof window === "undefined") return;
    if (previousPathname === pathname) return;
    if (isScrollPreservedPath(pathname)) return;
    if (window.location.hash) return;

    if (hasPendingCartScrollRestoreForPath(pathWithSearch)) return;

    return scheduleScrollTopResets();
  }, [pathWithSearch, pathname]);

  return null;
}
