"use client";

import { useEffect, useRef, useState } from "react";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import { MenuLinks } from "./menuLinks";
import { TOPBAR_COPY } from "./topBar.copy";
import type { LoginStatus } from "@/lib/useLoginStatus";
import type { TopBarIntentHandlers } from "./topBar.header";

type TopBarDrawerProps = {
  loginStatus: LoginStatus | null;
  onRequestLogout?: () => void;
  isLogoutPending?: boolean;
  isDrawerOpen: boolean;
  sevenDayIntentHandlers: TopBarIntentHandlers;
  onGoSevenDays: () => void;
  // onOpenCommandPalette: () => void;
  onCloseDrawer: () => void;
  onMenuItemClick: () => void;
};

export function TopBarDrawer({
  loginStatus,
  onRequestLogout,
  isLogoutPending = false,
  isDrawerOpen,
  sevenDayIntentHandlers,
  onGoSevenDays,
  // onOpenCommandPalette,
  onCloseDrawer,
  onMenuItemClick,
}: TopBarDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isDrawerOpen);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    if (isDrawerOpen) {
      setShouldRender(true);
      setIsAnimatingOpen(false);
      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = requestAnimationFrame(() => {
          setIsAnimatingOpen(true);
          openFrameRef.current = null;
        });
      });
      return;
    }

    setIsAnimatingOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      closeTimerRef.current = null;
    }, 300);
  }, [isDrawerOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <div
        aria-hidden={!isAnimatingOpen}
        className={`fixed bottom-0 right-0 z-[70] w-[260px] bg-white shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isAnimatingOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ top: "3.5rem" }}
      >
        <div className="flex flex-col gap-4 p-6 text-[15px] font-medium text-slate-600 [&_a]:text-slate-700 [&_a]:hover:text-slate-900">
          <MenuLinks
            loginStatus={loginStatus}
            onRequestLogout={onRequestLogout}
            isLogoutPending={isLogoutPending}
            onItemClick={onMenuItemClick}
            isDrawer
          />

          <div className="mt-2 h-px bg-slate-100" />

          {/* 중복 CTA 정리 전까지 보관합니다.
          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="rounded-xl px-2 py-1 text-left text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:px-3 hover:text-slate-900 active:scale-[0.99] focus:outline-none focus-visible:bg-slate-50 focus-visible:px-3 focus-visible:text-slate-900"
          >
            <span className="font-semibold">{TOPBAR_COPY.sevenDayPurchaseText}</span>
          </button>
          */}

          {/* 빠른 메뉴 실행은 현재 우선순위가 낮아 비활성화해 둡니다.
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="rounded-xl px-2 py-1 text-left text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:px-3 hover:text-slate-900 active:scale-[0.99] focus:outline-none focus-visible:bg-slate-50 focus-visible:px-3 focus-visible:text-slate-900"
          >
            <span className="font-semibold">{TOPBAR_COPY.commandButtonLabel} (Ctrl+K)</span>
          </button>
          */}

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] px-5 py-2 text-sm font-semibold !text-white shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 after:content-[''] hover:after:opacity-10"
          >
            {TOPBAR_COPY.startText}
          </button>

          {loginStatus !== null && loginStatus.isUserLoggedIn !== true && (
            <KakaoLoginButton fullWidth />
          )}
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-[69] bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          isAnimatingOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{ top: "3.5rem" }}
        onClick={onCloseDrawer}
      />
    </>
  );
}
