"use client";

import type { RefObject } from "react";
import IntentPrefetchLink from "@/components/common/intentPrefetchLink";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import type { LoginStatus } from "@/lib/useLoginStatus";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  AiPromptBadge,
  BetaBadge,
  DesktopOperatorLinks,
  IdentityMenuLinks,
  menuItemClasses,
  type LinkPressHandlers,
  type MenuVisibility,
} from "./menuLinks.shared";

type DesktopMenuContentProps = {
  aiOpen: boolean;
  onToggleAiOpen: () => void;
  onCloseAiOpen: () => void;
  aiRef: RefObject<HTMLDivElement>;
  onItemClick?: () => void;
  pressHandlers: LinkPressHandlers;
  loginStatus: LoginStatus | null;
  visibility: MenuVisibility;
  adminVisible: boolean;
};

export function DesktopMenuContent({
  aiOpen,
  onToggleAiOpen,
  onCloseAiOpen,
  aiRef,
  onItemClick,
  pressHandlers,
  loginStatus,
  visibility,
  adminVisible,
}: DesktopMenuContentProps) {
  return (
    <>
      <IntentPrefetchLink
        href="/explore"
        className={menuItemClasses()}
        {...pressHandlers}
      >
        상품 둘러보기
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/my-orders"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        내 주문 조회
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/column"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        칼럼
      </IntentPrefetchLink>

      <div className="relative flex items-center gap-2" ref={aiRef}>
        <button
          onClick={onToggleAiOpen}
          className="hover:text-gray-800 inline-flex items-center gap-1 font-semibold transition-transform duration-200 ease-in-out hover:scale-105"
          aria-haspopup="menu"
          aria-expanded={aiOpen}
        >
          <span className="inline-flex items-center gap-2">
            <span>AI 진단 검사</span>
            <AiPromptBadge />
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${aiOpen ? "rotate-180" : ""}`}
          />
        </button>

        <IntentPrefetchLink
          href="/chat"
          className={menuItemClasses("ml-1.5 inline-flex items-center gap-1 leading-none")}
          onClick={onItemClick}
        >
          <span>AI 맞춤 상담</span>
          <BetaBadge className="ml-0.5" />
        </IntentPrefetchLink>

        {aiOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 p-2">
            <IntentPrefetchLink
              href="/assess"
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
              onClick={() => {
                onCloseAiOpen();
                onItemClick?.();
              }}
            >
              <span>정밀 검사</span>
              <BetaBadge className="ml-2" />
            </IntentPrefetchLink>

            <IntentPrefetchLink
              href="/check-ai"
              className="block rounded-lg px-3 py-2 text-slate-800 hover:bg-slate-50"
              onClick={() => {
                onCloseAiOpen();
                onItemClick?.();
              }}
            >
              빠른 검사
            </IntentPrefetchLink>
          </div>
        )}
      </div>

      <DesktopOperatorLinks
        showPharmMenus={visibility.showPharmMenus}
        showRiderMenus={visibility.showRiderMenus}
        onItemClick={onItemClick}
      />

      {loginStatus !== null && !visibility.kakaoLoggedIn && (
        <div className="hidden md:block">
          <KakaoLoginButton />
        </div>
      )}

      <IdentityMenuLinks
        adminVisible={adminVisible}
        isAdminLoggedIn={visibility.isAdminLoggedIn}
        showAdminMenus={visibility.showAdminMenus}
        kakaoLoggedIn={visibility.kakaoLoggedIn}
        onItemClick={onItemClick}
      />
    </>
  );
}
