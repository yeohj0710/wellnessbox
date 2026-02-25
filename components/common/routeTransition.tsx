"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ROUTE_TRANSITION_HIDE_DELAY_MS = 420;
const ROUTE_TRANSITION_FAILSAFE_MS = 700;

export default function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== "A") el = el.parentElement;
      if (!el) return;
      const a = el as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      const loweredHref = href.trim().toLowerCase();
      if (
        loweredHref.startsWith("blob:") ||
        loweredHref.startsWith("data:") ||
        loweredHref.startsWith("mailto:") ||
        loweredHref.startsWith("tel:") ||
        loweredHref.startsWith("javascript:")
      ) {
        return;
      }

      if (href.startsWith("#")) {
        e.preventDefault();
        const id = decodeURIComponent(href.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", href);
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;

      const samePathAndSearch =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;

      if (samePathAndSearch && url.hash) {
        e.preventDefault();
        const id = decodeURIComponent(url.hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", url.hash);
        return;
      }

      if (samePathAndSearch && !url.hash) return;

      e.preventDefault();
      pending.current = url.pathname + url.search + url.hash;
      setShow(true);
      const nav = () => router.push(pending.current!);
      const anyDoc: any = document;
      if (anyDoc.startViewTransition) anyDoc.startViewTransition(() => nav());
      else nav();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    if (!pending.current) return;
    const t = setTimeout(() => {
      setShow(false);
      pending.current = null;
    }, ROUTE_TRANSITION_HIDE_DELAY_MS);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!show) return;
    const failSafe = setTimeout(() => {
      setShow(false);
      pending.current = null;
    }, ROUTE_TRANSITION_FAILSAFE_MS);
    return () => clearTimeout(failSafe);
  }, [show]);

  useEffect(() => {
    const onHash = () => {
      if (show) {
        setShow(false);
        pending.current = null;
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 top-14 h-[2px] z-[10000] overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-[route-progress_1s_ease-in-out_infinite]" />
      </div>
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 top-14 z-[9999] flex items-center justify-center bg-white/18 backdrop-blur-[2px]">
        <div className="relative w-16 h-16">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-sky-400/30 to-indigo-400/30 blur-xl animate-[glow_1.6s_ease-in-out_infinite]" />
          <div className="absolute inset-0 rounded-full bg-white/60 backdrop-blur-md shadow-lg" />
          <div className="absolute inset-0 animate-spin">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full bg-sky-500 shadow" />
          </div>
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            sizes="28px"
            className="absolute inset-0 m-auto h-7 w-7 animate-pulse"
          />
        </div>
      </div>
      <style jsx global>{`
        @keyframes route-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
        @keyframes glow {
          0%,
          100% {
            opacity: 0.55;
            filter: blur(14px);
          }
          50% {
            opacity: 0.9;
            filter: blur(22px);
          }
        }
      `}</style>
    </>
  );
}
