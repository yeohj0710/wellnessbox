'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MenuLinks } from "./menuLinks";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useLoading } from "@/components/common/loadingContext.client";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [cartCount, setCartCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const { showLoading } = useLoading();
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      setTimeout(() => {
        if (typeof window === "undefined") return;
        try {
          const cart = JSON.parse(localStorage.getItem("cartItems") || "[]");
          setCartCount(cart.length);
        } catch (e) {}
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

  const goSevenDays = () => {
    setIsDrawerOpen(false);
    showLoading();
    router.push("/?package=7#home-products");
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

  // Hide TopBar on scroll only when on /chat
  useEffect(() => {
    if (!pathname?.startsWith("/chat")) return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const last = lastYRef.current || 0;
      const down = y > last + 8;
      const up = y < last - 8;
      lastYRef.current = y;
      if (y < 24) {
        setHideOnScroll(false);
      } else if (down) {
        setHideOnScroll(true);
      } else if (up) {
        setHideOnScroll(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true } as any);
    return () => window.removeEventListener("scroll", onScroll as any);
  }, [pathname]);

  const menuItemClasses = (additionalClasses = "") => {
    return `relative transition-transform duration-200 ease-in-out hover:scale-[1.02] ${additionalClasses}`;
  };

  return (
    <>
      <header className={`fixed top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-transform duration-300 will-change-transform ${hideOnScroll ? "-translate-y-full" : "translate-y-0"}`}>
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[120rem]">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={menuItemClasses(
                "group text-[17px] font-extrabold tracking-tight flex items-center gap-2"
              )}
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
              웰니스박스
            </Link>

            <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-500 [&_a]:text-slate-500 [&_a:hover]:text-slate-900">
              <MenuLinks loginStatus={loginStatus} />
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {loginStatus.isTestLoggedIn && (
              <span className="hidden sm:inline-flex rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-white cursor-default">
                테스트
              </span>
            )}
            <Link
              href="/?cart=open#home-products"
              scroll={false}
              className={menuItemClasses("text-slate-600 relative")}
              aria-label="장바구니"
              onClick={() => {
                showLoading();
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("scrollPos", String(window.scrollY));
                }
              }}
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={goSevenDays}
              className="hidden sm:block text-[15px] font-semibold text-slate-600"
            >
              7일 무료체험
            </button>
            <Link
              href="/?package=7#home-products"
              className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
              onClick={showLoading}
            >
              시작하기
            </Link>
            <button
              className={menuItemClasses("text-2xl ml-1 lg:hidden")}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed top-14 bottom-0 z-40 bg-white shadow-lg w-[260px] transition-[right] duration-300 ${
          isDrawerOpen ? "right-0" : "-right-[260px]"
        }`}
      >
        <div className="flex flex-col p-6 gap-4 text-[15px] font-medium text-slate-600 [&_a]:text-slate-700 [&_a]:hover:text-slate-900">
          <MenuLinks
            loginStatus={loginStatus}
            onItemClick={closeDrawer}
            isDrawer
          />
          <div className="mt-2 h-px bg-slate-100" />
          <button onClick={goSevenDays} className="text-left text-slate-500">
            7일 무료체험
          </button>
          <Link
            href="/?package=7#home-products"
            onClick={() => {
              closeDrawer();
              showLoading();
            }}
            className="group relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold !text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
          >
            시작하기
          </Link>
        </div>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed top-14 inset-x-0 bottom-0 z-30 bg-black/40"
          onClick={closeDrawer}
        />
      )}
    </>
  );
}
