"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuLinks } from "./menuLinks";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useLoading } from "@/components/common/loadingContext.client";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";

type LoginStatus = {
  isUserLoggedIn: boolean;
  isPharmLoggedIn: boolean;
  isRiderLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  isTestLoggedIn: boolean;
};

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const { showLoading } = useLoading();
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const lastYRef = useRef(0);

  const refreshLoginStatus = useCallback(async () => {
    try {
      const s = await getLoginStatus();
      setLoginStatus({
        isUserLoggedIn: !!s?.isUserLoggedIn,
        isPharmLoggedIn: !!s?.isPharmLoggedIn,
        isRiderLoggedIn: !!s?.isRiderLoggedIn,
        isAdminLoggedIn: !!s?.isAdminLoggedIn,
        isTestLoggedIn: !!s?.isTestLoggedIn,
      });
    } catch {
      setLoginStatus({
        isUserLoggedIn: false,
        isPharmLoggedIn: false,
        isRiderLoggedIn: false,
        isAdminLoggedIn: false,
        isTestLoggedIn: false,
      });
    }
  }, []);

  const anyLoggedIn =
    !!loginStatus &&
    (loginStatus.isUserLoggedIn ||
      loginStatus.isPharmLoggedIn ||
      loginStatus.isRiderLoggedIn ||
      loginStatus.isAdminLoggedIn ||
      loginStatus.isTestLoggedIn);

  useEffect(() => {
    refreshLoginStatus();
  }, [refreshLoginStatus]);

  useEffect(() => {
    refreshLoginStatus();
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
          const cart = JSON.parse(localStorage.getItem("cartItems") || "[]");
          setCartCount(cart.length);
        } catch {}
      }, 0);
    };
    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const shouldShowLoading = (url: string) => {
    const currentPath = pathname?.split("?")[0].split("#")[0];
    const nextPath = url.split("?")[0].split("#")[0];
    return currentPath !== nextPath;
  };

  const goSevenDays = () => {
    setIsDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("closeCart"));
    }
    const url = "/?package=7#home-products";
    if (shouldShowLoading(url)) {
      showLoading();
    }
    router.push(url);
  };

  const goHome = () => {
    setIsDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("closeCart"));
    }
    const url = "/";
    if (shouldShowLoading(url)) {
      showLoading();
    }
    router.push(url);
  };

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

  useEffect(() => {
    if (pathname?.startsWith("/chat")) {
      setHideOnScroll(false);
      return;
    }
  }, [pathname]);

  const menuItemClasses = (additionalClasses = "") => {
    return `relative transition-transform duration-200 ease-in-out hover:scale-[1.02] ${additionalClasses}`;
  };

  return (
    <>
      <header
        className={`fixed top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-transform duration-300 will-change-transform ${
          hideOnScroll ? "-translate-y-full" : "translate-y-0"
        }`}
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
              <MenuLinks loginStatus={loginStatus} />
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {loginStatus?.isTestLoggedIn && (
              <span className="hidden sm:inline-flex rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-white cursor-default">
                테스트
              </span>
            )}

            {pathname === "/" ? (
              <button
                className={menuItemClasses("text-slate-600 relative")}
                aria-label="장바구니"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("scrollPos", String(window.scrollY));
                    window.dispatchEvent(new Event("openCart"));
                  }
                }}
              >
                <ShoppingCartIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/?cart=open#home-products"
                scroll={false}
                className={menuItemClasses("text-slate-600 relative")}
                aria-label="장바구니"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("scrollPos", String(window.scrollY));
                  }
                  showLoading();
                }}
              >
                <ShoppingCartIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={goSevenDays}
              className="hidden sm:block text-[15px] font-semibold text-slate-600"
            >
              7일 무료체험
            </button>

            <button
              onClick={goSevenDays}
              className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
            >
              시작하기
            </button>

            <button
              className={menuItemClasses("text-2xl ml-1 min-[1440px]:hidden")}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed bottom-0 z-40 bg-white shadow-lg w-[260px] transition-[right] duration-300 ${
          isDrawerOpen ? "right-0" : "-right-[260px]"
        }`}
        style={{ top: "3.5rem" }}
      >
        <div className="flex flex-col p-6 gap-4 text-[15px] font-medium text-slate-600 [&_a]:text-slate-700 [&_a]:hover:text-slate-900">
          <MenuLinks
            loginStatus={loginStatus}
            onItemClick={closeDrawer}
            isDrawer
          />

          {loginStatus !== null && !anyLoggedIn && (
            <KakaoLoginButton fullWidth />
          )}

          <div className="mt-2 h-px bg-slate-100" />

          <button onClick={goSevenDays} className="text-left text-slate-500">
            7일 무료체험
          </button>

          <button
            onClick={goSevenDays}
            className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold !text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
          >
            시작하기
          </button>
        </div>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 bg-black/40"
          style={{ top: "3.5rem" }}
          onClick={closeDrawer}
        />
      )}
    </>
  );
}
