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

  const closeCartOverlay = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
    localStorage.removeItem("openCart");
    window.dispatchEvent(new Event("closeCart"));
  }, []);

  const openCommandPalette = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("wb:open-command-palette"));
  }, []);

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
        router.push(url);
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

  const closeDrawerAndOpenCommandPalette = useCallback(() => {
    setIsDrawerOpen(false);
    openCommandPalette();
  }, [openCommandPalette]);

  const requestLogout = useCallback(async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setIsDrawerOpen(false);
    closeCartOverlay();
    showLoading();

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        window.location.assign("/api/auth/logout");
        return;
      }

      window.location.assign("/");
    } catch {
      window.location.assign("/api/auth/logout");
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
        onOpenCommandPalette={openCommandPalette}
        onToggleDrawer={() => setIsDrawerOpen((value) => !value)}
        onMenuItemClick={handleMenuItemClick}
      />

      <TopBarDrawer
        loginStatus={loginStatus}
        onRequestLogout={requestLogout}
        isLogoutPending={logoutPending}
        isDrawerOpen={isDrawerOpen}
        sevenDayIntentHandlers={sevenDayIntentHandlers}
        onGoSevenDays={goSevenDays}
        onOpenCommandPalette={closeDrawerAndOpenCommandPalette}
        onCloseDrawer={closeDrawer}
        onMenuItemClick={handleMenuItemClick}
      />
    </>
  );
}
