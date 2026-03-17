"use client";

import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import { MenuLinks } from "./menuLinks";
import type { LoginStatus } from "@/lib/useLoginStatus";
import type { TopBarIntentHandlers } from "./topBar.header";

type TopBarDrawerProps = {
  loginStatus: LoginStatus | null;
  onRequestLogout?: () => void;
  isLogoutPending?: boolean;
  isDrawerOpen: boolean;
  sevenDayIntentHandlers: TopBarIntentHandlers;
  onGoSevenDays: () => void;
  onOpenCommandPalette: () => void;
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
  onOpenCommandPalette,
  onCloseDrawer,
  onMenuItemClick,
}: TopBarDrawerProps) {
  return (
    <>
      <div
        className={`fixed bottom-0 z-[70] bg-white shadow-lg w-[260px] transition-[right] duration-300 ${
          isDrawerOpen ? "right-0" : "-right-[260px]"
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

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="rounded-xl px-2 py-1 text-left text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:px-3 hover:text-slate-900 active:scale-[0.99] focus:outline-none focus-visible:bg-slate-50 focus-visible:px-3 focus-visible:text-slate-900"
          >
            <span className="font-semibold">7일치 구매하기</span>
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="rounded-xl px-2 py-1 text-left text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:px-3 hover:text-slate-900 active:scale-[0.99] focus:outline-none focus-visible:bg-slate-50 focus-visible:px-3 focus-visible:text-slate-900"
          >
            <span className="font-semibold">빠른 메뉴 실행 (Ctrl+K)</span>
          </button>

          <button
            {...sevenDayIntentHandlers}
            onClick={onGoSevenDays}
            className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] px-5 py-2 text-sm font-semibold !text-white shadow-[0_10px_30px_rgba(86,115,255,0.35)] transition-all duration-300 ease-out will-change-transform hover:scale-[1.03] hover:shadow-[0_14px_36px_rgba(86,115,255,0.5)] hover:saturate-150 hover:brightness-110 hover:from-[#6BD1FF] hover:to-[#6E58FF] active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#6E58FF] after:absolute after:inset-0 after:rounded-full after:bg-white/20 after:opacity-0 after:content-[''] hover:after:opacity-10"
          >
            시작하기
          </button>

          {loginStatus !== null && loginStatus.isUserLoggedIn !== true && (
            <KakaoLoginButton fullWidth />
          )}
        </div>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-[69] bg-black/40"
          style={{ top: "3.5rem" }}
          onClick={onCloseDrawer}
        />
      )}
    </>
  );
}
