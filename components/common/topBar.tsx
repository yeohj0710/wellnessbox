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
import { MenuLinks } from "./menuLinks";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useLoading } from "@/components/common/loadingContext.client";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import { usePrefetchOnIntent } from "@/components/common/usePrefetchOnIntent";
import { readClientCartItems } from "@/lib/client/cart-storage";
import {
  clearCartReturnState,
  consumeCartScrollRestoreForPath,
} from "@/lib/client/cart-navigation";

type LoginStatus = {
  isUserLoggedIn: boolean;
  isPharmLoggedIn: boolean;
  isRiderLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  isTestLoggedIn: boolean;
};
const GLOBAL_CART_OPEN_KEY = "wbGlobalCartOpen";

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

  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const { showLoading } = useLoading();

  const reqSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const refreshLoginStatus = useCallback(async () => {
    reqSeqRef.current += 1;
    const seq = reqSeqRef.current;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const s = await getLoginStatus(ac.signal);

      if (ac.signal.aborted) return;
      if (seq !== reqSeqRef.current) return;

      setLoginStatus({
        isUserLoggedIn: s.isUserLoggedIn === true,
        isPharmLoggedIn: s.isPharmLoggedIn === true,
        isRiderLoggedIn: s.isRiderLoggedIn === true,
        isAdminLoggedIn: s.isAdminLoggedIn === true,
        isTestLoggedIn: s.isTestLoggedIn === true,
      });
    } catch (e) {
      if (ac.signal.aborted) return;
      if (seq !== reqSeqRef.current) return;

      setLoginStatus({
        isUserLoggedIn: false,
        isPharmLoggedIn: false,
        isRiderLoggedIn: false,
        isAdminLoggedIn: false,
        isTestLoggedIn: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshLoginStatus();
    return () => {
      abortRef.current?.abort();
    };
  }, [refreshLoginStatus]);

  useEffect(() => {
    refreshLoginStatus();
    setIsDrawerOpen(false);
  }, [pathname, refreshLoginStatus]);

  useEffect(() => {
    const onFocus = () => refreshLoginStatus();
    const onVis = () => {
      if (!document.hidden) refreshLoginStatus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshLoginStatus]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    refreshLoginStatus();
  }, [isDrawerOpen, refreshLoginStatus]);

  useEffect(() => {
    const updateCartCount = () => {
      setTimeout(() => {
        if (typeof window === "undefined") return;
        try {
          setCartCount(readClientCartItems().length);
        } catch {}
      }, 0);
    };

    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

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

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleMenuItemClick = useCallback(() => {
    setIsDrawerOpen(false);
    closeCartOverlay();
  }, [closeCartOverlay]);

  const shouldShowLoading = (url: string) => {
    const currentPath = pathname?.split("?")[0].split("#")[0];
    const nextPath = url.split("?")[0].split("#")[0];
    return currentPath !== nextPath;
  };

  const sevenDayHref = "/?package=7#home-products";
  const sevenDayIntentHandlers = usePrefetchOnIntent({
    href: sevenDayHref,
    router,
  });

  const goSevenDays = () => {
    setIsDrawerOpen(false);
    closeCartOverlay();
    const url = sevenDayHref;
    if (shouldShowLoading(url)) {
      showLoading();
    }
    startTransition(() => {
      router.push(url);
    });
  };

  const goHome = () => {
    setIsDrawerOpen(false);
    closeCartOverlay();
    const url = "/";
    if (shouldShowLoading(url)) {
      showLoading();
    }
    startTransition(() => {
      router.push(url);
    });
  };

  const openCartFromOutside = useCallback(() => {
    if (typeof window !== "undefined") {
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
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logoRef.current) {
        logoRef.current.classList.add("animate-bounce-custom");
        setTimeout(() => {
          logoRef.current?.classList.remove("animate-bounce-custom");
        }, 1200);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const searchParamsString = searchParams?.toString() ?? "";
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathWithSearch = `${pathname || "/"}${
      searchParamsString ? `?${searchParamsString}` : ""
    }`;
    const restoreY = consumeCartScrollRestoreForPath(pathWithSearch);
    if (typeof restoreY !== "number") return;

    const restore = () => {
      window.scrollTo(0, restoreY);
      requestAnimationFrame(() => window.scrollTo(0, restoreY));
    };
    requestAnimationFrame(restore);
  }, [pathname, searchParamsString]);

  const menuItemClasses = (additionalClasses = "") => {
    return `relative transition-transform duration-200 ease-in-out hover:scale-[1.02] ${additionalClasses}`;
  };

  return (
    <>
      <header
        className="fixed top-0 z-40 w-full border-b border-slate-200/80 bg-white"
      >
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[120rem]">
          <div className="flex items-center gap-6">
            <button
              onClick={goHome}
              className={menuItemClasses(
                "group text-[17px] font-extrabold tracking-tight flex items-center gap-2"
              )}
              aria-label="홈으로"
            >
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="웰니스박스"
                  ref={logoRef}
                  fill
                  sizes="64px"
                  className="object-contain group-hover:animate-bounce-custom"
                />
              </div>
              <span>웰니스박스</span>
            </button>

            <nav className="hidden min-[1440px]:flex items-center gap-8 text-[15px] font-medium text-slate-500 [&_a]:text-slate-500 [&_a:hover]:text-slate-900">
              <MenuLinks
                loginStatus={loginStatus}
                onItemClick={handleMenuItemClick}
              />
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {loginStatus?.isTestLoggedIn === true && (
              <span className="hidden sm:inline-flex rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-white cursor-default">
                테스트
              </span>
            )}

            <button
              className={menuItemClasses("text-slate-600 relative")}
              aria-label="장바구니"
              onClick={openCartFromOutside}
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCommandPalette}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              aria-label="Open command palette"
              title="Ctrl+K"
            >
              <span>빠른 메뉴 실행</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px]">
                Ctrl+K
              </kbd>
            </button>

            <button
              {...sevenDayIntentHandlers}
              onClick={goSevenDays}
              className="hidden sm:block text-[15px] font-semibold text-slate-600"
            >
              7일치 구매하기
            </button>

            <button
              {...sevenDayIntentHandlers}
              onClick={goSevenDays}
              className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
            >
              시작하기
            </button>

            <button
              className={menuItemClasses("text-2xl ml-1 min-[1440px]:hidden")}
              onClick={() => setIsDrawerOpen((v) => !v)}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed bottom-0 z-[70] bg-white shadow-lg w-[260px] transition-[right] duration-300 ${
          isDrawerOpen ? "right-0" : "-right-[260px]"
        }`}
        style={{ top: "3.5rem" }}
      >
        <div className="flex flex-col p-6 gap-4 text-[15px] font-medium text-slate-600 [&_a]:text-slate-700 [&_a]:hover:text-slate-900">
          <MenuLinks
            loginStatus={loginStatus}
            onItemClick={handleMenuItemClick}
            isDrawer
          />

          {loginStatus !== null && loginStatus.isUserLoggedIn !== true && (
            <KakaoLoginButton fullWidth />
          )}

          <div className="mt-2 h-px bg-slate-100" />

          <button
            {...sevenDayIntentHandlers}
            onClick={goSevenDays}
            className="text-left text-slate-500"
          >
            7일치 구매하기
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDrawerOpen(false);
              openCommandPalette();
            }}
            className="text-left text-slate-500"
          >
            빠른 메뉴 실행 (Ctrl+K)
          </button>

          <button
            {...sevenDayIntentHandlers}
            onClick={goSevenDays}
            className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold !text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
          >
            시작하기
          </button>
        </div>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-[69] bg-black/40"
          style={{ top: "3.5rem" }}
          onClick={closeDrawer}
        />
      )}
    </>
  );
}
