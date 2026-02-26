"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLoading } from "@/components/common/loadingContext.client";

function normalizePathWithSearch(input: string) {
  try {
    const url = new URL(input, window.location.href);
    return `${url.pathname}${url.search}`;
  } catch {
    return input;
  }
}

export default function RouteChangeLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showLoading } = useLoading();
  const currentPathRef = useRef<string>("");

  useEffect(() => {
    const search = searchParams?.toString();
    currentPathRef.current = `${pathname || ""}${search ? `?${search}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        href.startsWith("#")
      ) {
        return;
      }

      const nextPath = normalizePathWithSearch(anchor.href);
      if (!nextPath) return;
      const currentPath =
        currentPathRef.current ||
        `${window.location.pathname}${window.location.search}`;
      if (nextPath === currentPath) return;

      showLoading();
    }

    function handlePopState() {
      showLoading();
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showLoading]);

  return null;
}
