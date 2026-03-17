"use client";

import type { ComponentPropsWithoutRef, RefObject } from "react";
import Image from "next/image";
import { Bars3Icon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { MenuLinks } from "./menuLinks";
import { TOPBAR_COPY } from "./topBar.copy";
import { useTopBarDrawerMode } from "./useTopBarDrawerMode";
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

const secondaryActionButtonClasses =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200";

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
  const layoutDependencyKey = `${Boolean(loginStatus?.isUserLoggedIn)}:${Boolean(
    loginStatus?.isPharmLoggedIn
  )}:${Boolean(loginStatus?.isRiderLoggedIn)}:${Boolean(
    loginStatus?.isAdminLoggedIn
  )}:${Boolean(loginStatus?.isTestLoggedIn)}:${Boolean(isLogoutPending)}`;
  const { isDrawerMode, rowRef, leftBrandRef, navRef, rightActionsRef } =
    useTopBarDrawerMode({
      onDrawerModeChange,
      layoutDependencyKey,
    });

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
            aria-label={TOPBAR_COPY.brandAriaLabel}
          >
            <div className="relative w-8 h-8">
              <Image
                src="/logo.png"
                alt={TOPBAR_COPY.brandAlt}
                ref={logoRef}
                fill
                sizes="64px"
                className="object-contain group-hover:animate-bounce-custom"
              />
            </div>
            <span>{TOPBAR_COPY.brandText}</span>
          </button>

          <nav
            ref={navRef}
            className={`hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-500 [&_a]:text-slate-500 [&_a:hover]:text-slate-900 [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out ${
              isDrawerMode
                ? "max-w-0 overflow-hidden opacity-0 pointer-events-none"
                : "max-w-[2200px] overflow-visible opacity-100"
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
              {TOPBAR_COPY.testBadge}
            </span>
          )}

          <button
            className={menuItemClasses("text-slate-600 relative")}
            aria-label={TOPBAR_COPY.cartAriaLabel}
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
            className={`hidden md:inline-flex whitespace-nowrap ${secondaryActionButtonClasses}`}
            aria-label={TOPBAR_COPY.commandButtonAriaLabel}
            title="Ctrl+K"
          >
            <span>{TOPBAR_COPY.commandButtonLabel}</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px]">
              Ctrl+K
            </kbd>
          </button>

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="hidden sm:inline-flex shrink-0 whitespace-nowrap items-center rounded-full px-3 py-2 text-[15px] font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            {TOPBAR_COPY.sevenDayPurchaseText}
          </button>

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="group relative inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 hover:after:opacity-10"
          >
            {TOPBAR_COPY.startText}
          </button>

          <button
            className={menuItemClasses(
              `text-2xl ml-1 ${isDrawerMode ? "inline-flex" : "hidden"}`
            )}
            onClick={onToggleDrawer}
            aria-label={TOPBAR_COPY.drawerButtonAriaLabel}
          >
            <Bars3Icon className="h-6 w-6 text-slate-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
