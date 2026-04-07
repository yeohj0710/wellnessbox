"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const AppBackHandler = dynamic(() => import("./appBackHandler"), {
  ssr: false,
});
const TopBar = dynamic(() => import("./topBar"), {
  ssr: false,
});
const GlobalCartHost = dynamic(() => import("@/components/order/globalCartHost"), {
  ssr: false,
});
const ChatCartActionHost = dynamic(
  () => import("@/components/chat/ChatCartActionHost"),
  {
    ssr: false,
  }
);
const DesktopChatDock = dynamic(() => import("@/components/chat/DesktopChatDock"), {
  ssr: false,
});
const CommandPalette = dynamic(() => import("./commandPalette"), {
  ssr: false,
});
const RouteChangeLoading = dynamic(() => import("./routeChangeLoading"), {
  ssr: false,
});
const RouteScrollPolicy = dynamic(() => import("./routeScrollPolicy"), {
  ssr: false,
});

const GLOBAL_CART_OPEN_KEY = "wbGlobalCartOpen";
const GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY = "openCart";
const OPEN_COMMAND_PALETTE_EVENT = "wb:open-command-palette";
const OPEN_CHAT_DOCK_EVENT = "wb:chat-open-dock";
const NON_CRITICAL_MOUNT_TIMEOUT_MS = 1600;

function isPdfExportViewPath(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/employee-report/export-view") return true;
  return pathname.startsWith("/admin/b2b-reports/export-view/");
}

function useDeferredNonCriticalMount(delayMs = NON_CRITICAL_MOUNT_TIMEOUT_MS) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady || typeof window === "undefined") return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const requestIdle = (window as typeof window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    }).requestIdleCallback;
    const cancelIdle = (window as typeof window & {
      cancelIdleCallback?: (handle: number) => void;
    }).cancelIdleCallback;

    const markReady = () => {
      if (cancelled) return;
      setIsReady(true);
    };

    const handleInteraction = () => {
      markReady();
    };

    window.addEventListener("pointerdown", handleInteraction, {
      passive: true,
      once: true,
    });
    window.addEventListener("touchstart", handleInteraction, {
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", handleInteraction, { once: true });

    if (typeof requestIdle === "function") {
      idleId = requestIdle(markReady, { timeout: delayMs });
    } else {
      timeoutId = window.setTimeout(markReady, delayMs);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      if (idleId !== null && typeof cancelIdle === "function") {
        cancelIdle(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delayMs, isReady]);

  return isReady;
}

function LazyGlobalCartHost() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount || typeof window === "undefined") return;

    const hasPendingOpen =
      sessionStorage.getItem(GLOBAL_CART_OPEN_KEY) === "1" ||
      localStorage.getItem(GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY) === "true";
    if (hasPendingOpen) {
      setShouldMount(true);
      return;
    }

    const handleOpenCart = () => {
      setShouldMount(true);
    };

    window.addEventListener("openCart", handleOpenCart, { once: true });
    return () => {
      window.removeEventListener("openCart", handleOpenCart);
    };
  }, [shouldMount]);

  return shouldMount ? <GlobalCartHost /> : null;
}

function LazyChatCartActionHost() {
  const deferredReady = useDeferredNonCriticalMount();
  return deferredReady ? <ChatCartActionHost /> : null;
}

function LazyCommandPalette() {
  const [shouldMount, setShouldMount] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleShortcut = (event: KeyboardEvent) => {
      const isMetaK =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k";
      if (!isMetaK) return;

      if (shouldMount) {
        event.preventDefault();
        window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
        return;
      }

      event.preventDefault();
      setOpenOnMount(true);
      setShouldMount(true);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [shouldMount]);

  return shouldMount ? <CommandPalette initiallyOpen={openOnMount} /> : null;
}

function LazyDesktopChatDock() {
  const deferredReady = useDeferredNonCriticalMount();
  const [shouldMount, setShouldMount] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  useEffect(() => {
    if (!deferredReady) return;
    setShouldMount(true);
  }, [deferredReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenDock = () => {
      if (!shouldMount) {
        setPendingOpen(true);
      }
      setShouldMount(true);
    };

    window.addEventListener(OPEN_CHAT_DOCK_EVENT, handleOpenDock);
    return () => {
      window.removeEventListener(OPEN_CHAT_DOCK_EVENT, handleOpenDock);
    };
  }, [shouldMount]);

  useEffect(() => {
    if (!shouldMount || !pendingOpen || typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event(OPEN_CHAT_DOCK_EVENT));
      setPendingOpen(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [pendingOpen, shouldMount]);

  return shouldMount ? <DesktopChatDock /> : null;
}

export default function RootLayoutEnhancers() {
  const pathname = usePathname();
  if (isPdfExportViewPath(pathname)) {
    return null;
  }

  return (
    <>
      <RouteChangeLoading />
      <RouteScrollPolicy />
      <AppBackHandler />
      <div className="wb-global-chrome">
        <TopBar />
      </div>
      <LazyGlobalCartHost />
      <LazyChatCartActionHost />
      <div className="wb-global-chrome">
        <LazyDesktopChatDock />
      </div>
      <LazyCommandPalette />
    </>
  );
}
