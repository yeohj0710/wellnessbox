"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLoading } from "@/components/common/loadingContext.client";
import { usePrefetchOnIntent } from "@/components/common/usePrefetchOnIntent";
import { clearCartReturnState } from "@/lib/client/cart-navigation";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";
import { TopBarHeader } from "./topBar.header";
import { TopBarDrawer } from "./topBar.drawer";
import {
  useTopBarCartCount,
  useTopBarCartScrollRestore,
  useTopBarLoginStatus,
  useTopBarLogoBounce,
} from "./topBar.hooks";

const GLOBAL_CART_OPEN_KEY = "wbGlobalCartOpen";
const SEVEN_DAY_HREF = "/?package=7#home-products";
const CLOSE_TOPBAR_DRAWER_EVENT = "wb:topbar-close-drawer";

function resolveCurrentReturnToPath() {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  const composed = `${pathname}${search}${hash}`;
  if (!composed.startsWith("/") || composed.startsWith("//")) return "/";
  return composed;
}

export default function TopBar() {
  return (
    <Suspense fallback={<TopBarFallback />}>
      <TopBarInner />
    </Suspense>
  );
}

function TopBarFallback() {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[120rem]">
        <div className="text-[17px] font-extrabold tracking-tight text-slate-900">
          웰니스박스
        </div>
      </div>
    </header>
  );
}

function TopBarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { showLoading } = useLoading();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerMode, setIsDrawerMode] = useState(true);
  const [logoutPending, setLogoutPending] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);

  const { loginStatus } = useTopBarLoginStatus(pathname, isDrawerOpen);
  const cartCount = useTopBarCartCount();
  useTopBarLogoBounce(logoRef);

  const searchParamsString = searchParams?.toString() ?? "";
  useTopBarCartScrollRestore(pathname, searchParamsString);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onCloseDrawerByEvent = () => setIsDrawerOpen(false);
    window.addEventListener(CLOSE_TOPBAR_DRAWER_EVENT, onCloseDrawerByEvent);
    return () => {
      window.removeEventListener(CLOSE_TOPBAR_DRAWER_EVENT, onCloseDrawerByEvent);
    };
  }, []);

  useEffect(() => {
    if (!isDrawerMode) {
      setIsDrawerOpen(false);
    }
  }, [isDrawerMode]);

  const closeCartOverlay = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
    localStorage.removeItem("openCart");
    window.dispatchEvent(new Event("closeCart"));
  }, []);

  // 빠른 메뉴 실행은 현재 사용하지 않아 연결만 남겨 두고 비활성화합니다.
  // const openCommandPalette = useCallback(() => {
  //   if (typeof window === "undefined") return;
  //   window.dispatchEvent(new Event("wb:open-command-palette"));
  // }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleMenuItemClick = useCallback(() => {
    setIsDrawerOpen(false);
    closeCartOverlay();
  }, [closeCartOverlay]);

  const shouldShowLoading = useCallback(
    (url: string) => {
      const currentPath = pathname?.split("?")[0].split("#")[0];
      const nextPath = url.split("?")[0].split("#")[0];
      return currentPath !== nextPath;
    },
    [pathname]
  );

  const navigateTo = useCallback(
    (url: string) => {
      setIsDrawerOpen(false);
      closeCartOverlay();
      if (shouldShowLoading(url)) {
        showLoading();
      }
      startTransition(() => {
        navigateWithFallback(router, url);
      });
    },
    [closeCartOverlay, router, shouldShowLoading, showLoading, startTransition]
  );

  const goSevenDays = useCallback(() => {
    navigateTo(SEVEN_DAY_HREF);
  }, [navigateTo]);

  const goHome = useCallback(() => {
    navigateTo("/");
  }, [navigateTo]);

  const openCartFromOutside = useCallback(() => {
    if (typeof window === "undefined") return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    window.dispatchEvent(new Event("wb:chat-close-dock"));
    clearCartReturnState();
    sessionStorage.setItem("scrollPos", String(window.scrollY));
    sessionStorage.setItem(GLOBAL_CART_OPEN_KEY, "1");
    localStorage.setItem("openCart", "true");
    window.dispatchEvent(new Event("openCart"));
  }, []);

  // const closeDrawerAndOpenCommandPalette = useCallback(() => {
  //   setIsDrawerOpen(false);
  //   openCommandPalette();
  // }, [openCommandPalette]);

  const requestLogout = useCallback(async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setIsDrawerOpen(false);
    closeCartOverlay();
    showLoading();
    const returnTo = resolveCurrentReturnToPath();
    const fallbackLogoutUrl = `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        emitAuthSyncEvent({ scope: "user-session", reason: "logout-fallback" });
        window.location.assign(fallbackLogoutUrl);
        return;
      }

      emitAuthSyncEvent({ scope: "user-session", reason: "logout" });
      window.location.assign(returnTo);
    } catch {
      emitAuthSyncEvent({ scope: "user-session", reason: "logout-error" });
      window.location.assign(fallbackLogoutUrl);
    }
  }, [closeCartOverlay, logoutPending, showLoading]);

  const sevenDayIntentHandlers = usePrefetchOnIntent({
    href: SEVEN_DAY_HREF,
    router,
  });

  return (
    <>
      <TopBarHeader
        loginStatus={loginStatus}
        onRequestLogout={requestLogout}
        isLogoutPending={logoutPending}
        cartCount={cartCount}
        logoRef={logoRef}
        sevenDayIntentHandlers={sevenDayIntentHandlers}
        onGoHome={goHome}
        onGoSevenDays={goSevenDays}
        onOpenCart={openCartFromOutside}
        // onOpenCommandPalette={openCommandPalette}
        onToggleDrawer={() => setIsDrawerOpen((value) => !value)}
        onMenuItemClick={handleMenuItemClick}
        onDrawerModeChange={setIsDrawerMode}
      />

      <TopBarDrawer
        loginStatus={loginStatus}
        onRequestLogout={requestLogout}
        isLogoutPending={logoutPending}
        isDrawerOpen={isDrawerMode && isDrawerOpen}
        sevenDayIntentHandlers={sevenDayIntentHandlers}
        onGoSevenDays={goSevenDays}
        // onOpenCommandPalette={closeDrawerAndOpenCommandPalette}
        onCloseDrawer={closeDrawer}
        onMenuItemClick={handleMenuItemClick}
      />
    </>
  );
}
