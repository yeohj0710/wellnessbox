"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, RefObject } from "react";
import Image from "next/image";
import { Bars3Icon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { MenuLinks } from "./menuLinks";
import type { LoginStatus } from "@/lib/useLoginStatus";

export type TopBarIntentHandlers = Pick<
  ComponentPropsWithoutRef<"button">,
  "onPointerEnter" | "onMouseEnter" | "onFocus" | "onMouseLeave" | "onBlur"
>;

type TopBarHeaderProps = {
  loginStatus: LoginStatus | null;
  onRequestLogout?: () => void;
  isLogoutPending?: boolean;
  cartCount: number;
  logoRef: RefObject<HTMLImageElement | null>;
  sevenDayIntentHandlers: TopBarIntentHandlers;
  onGoHome: () => void;
  onGoSevenDays: () => void;
  onOpenCart: () => void;
  onOpenCommandPalette: () => void;
  onToggleDrawer: () => void;
  onMenuItemClick: () => void;
  onDrawerModeChange?: (enabled: boolean) => void;
};

const menuItemClasses = (additionalClasses = "") => {
  return `relative transition-transform duration-200 ease-in-out hover:scale-[1.02] ${additionalClasses}`;
};

const DESKTOP_MENU_MIN_VIEWPORT = 1024;
const LEFT_GROUP_GAP_PX = 24;
const WIDTH_EPSILON_PX = 2;
const LAYOUT_SAFETY_PX = 20;

export function TopBarHeader({
  loginStatus,
  onRequestLogout,
  isLogoutPending = false,
  cartCount,
  logoRef,
  sevenDayIntentHandlers,
  onGoHome,
  onGoSevenDays,
  onOpenCart,
  onOpenCommandPalette,
  onToggleDrawer,
  onMenuItemClick,
  onDrawerModeChange,
}: TopBarHeaderProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const leftBrandRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const rightActionsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isDrawerMode, setIsDrawerMode] = useState(true);

  const computeDrawerMode = useCallback(() => {
    if (typeof window === "undefined") return true;
    if (window.innerWidth < DESKTOP_MENU_MIN_VIEWPORT) return true;

    const rowNode = rowRef.current;
    const brandNode = leftBrandRef.current;
    const navNode = navRef.current;
    const rightNode = rightActionsRef.current;
    if (!rowNode || !brandNode || !navNode || !rightNode) return true;

    const availableWidth =
      rowNode.clientWidth -
      brandNode.getBoundingClientRect().width -
      rightNode.getBoundingClientRect().width -
      LEFT_GROUP_GAP_PX;

    const requiredWidth = navNode.scrollWidth;
    const exceedsWidth =
      requiredWidth > availableWidth - LAYOUT_SAFETY_PX + WIDTH_EPSILON_PX;
    if (exceedsWidth) return true;

    const rowOverflowing = rowNode.scrollWidth > rowNode.clientWidth + WIDTH_EPSILON_PX;
    if (rowOverflowing) return true;

    return false;
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
  }, [loginStatus, isLogoutPending, scheduleDrawerModeUpdate]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      scheduleDrawerModeUpdate();
    });
    const nodes = [rowRef.current, leftBrandRef.current, navRef.current, rightActionsRef.current];
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

  return (
    <header
      className="fixed top-0 z-40 w-full border-b border-slate-200/80 bg-white"
      data-topbar-mode={isDrawerMode ? "drawer" : "desktop"}
    >
      <div
        ref={rowRef}
        className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[120rem]"
      >
        <div className="flex items-center gap-6">
          <button
            ref={leftBrandRef}
            onClick={onGoHome}
            className={menuItemClasses(
              "group shrink-0 whitespace-nowrap text-[17px] font-extrabold tracking-tight flex items-center gap-2"
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

          <nav
            ref={navRef}
            className={`hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-500 [&_a]:text-slate-500 [&_a:hover]:text-slate-900 [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
              isDrawerMode
                ? "max-w-0 opacity-0 pointer-events-none"
                : "max-w-[2200px] opacity-100"
            }`}
            aria-hidden={isDrawerMode}
          >
            <MenuLinks
              loginStatus={loginStatus}
              onRequestLogout={onRequestLogout}
              isLogoutPending={isLogoutPending}
              onItemClick={onMenuItemClick}
            />
          </nav>
        </div>

        <div ref={rightActionsRef} className="flex items-center gap-3 md:gap-5">
          {loginStatus?.isTestLoggedIn === true && (
            <span className="hidden sm:inline-flex rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-white cursor-default">
              테스트
            </span>
          )}

          <button
            className={menuItemClasses("text-slate-600 relative")}
            aria-label="장바구니"
            onClick={onOpenCart}
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
            onClick={onOpenCommandPalette}
            className="hidden md:inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
            onClick={onGoSevenDays}
            className="hidden sm:block shrink-0 whitespace-nowrap text-[15px] font-semibold text-slate-600"
          >
            7일치 구매하기
          </button>

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="group relative inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
          >
            시작하기
          </button>

          <button
            className={menuItemClasses(`text-2xl ml-1 ${isDrawerMode ? "inline-flex" : "hidden"}`)}
            onClick={onToggleDrawer}
            aria-label="메뉴 열기"
          >
            <Bars3Icon className="h-6 w-6 text-slate-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
