"use client";

import IntentPrefetchLink from "@/components/common/intentPrefetchLink";
import {
  AiPromptBadge,
  BetaBadge,
  DrawerOperatorLinks,
  IdentityMenuLinks,
  menuItemClasses,
  type LinkPressHandlers,
  type MenuVisibility,
} from "./menuLinks.shared";

type DrawerMenuContentProps = {
  onRequestLogout?: () => void;
  isLogoutPending?: boolean;
  onItemClick?: () => void;
  pressHandlers: LinkPressHandlers;
  visibility: MenuVisibility;
  adminVisible: boolean;
};

export function DrawerMenuContent({
  onRequestLogout,
  isLogoutPending = false,
  onItemClick,
  pressHandlers,
  visibility,
  adminVisible,
}: DrawerMenuContentProps) {
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

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>AI 진단 검사</span>
        <AiPromptBadge />
      </div>

      <IntentPrefetchLink
        href="/assess"
        className="-mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-slate-50"
        onClick={onItemClick}
      >
        <span>정밀 검사</span>
        <BetaBadge className="ml-1" />
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/check-ai"
        className="-mt-4 rounded-lg px-3 py-2 -mb-2 hover:bg-slate-50"
        onClick={onItemClick}
      >
        빠른 검사
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/chat"
        className={`${menuItemClasses()} flex items-center mt-2`}
        onClick={onItemClick}
      >
        <span>AI 맞춤 상담</span>
        <BetaBadge className="ml-2" />
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/column"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        건강 칼럼
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/employee-report"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        임직원 레포트
      </IntentPrefetchLink>

      <DrawerOperatorLinks
        showPharmMenus={visibility.showPharmMenus}
        showRiderMenus={visibility.showRiderMenus}
        onItemClick={onItemClick}
      />

      <IdentityMenuLinks
        adminVisible={adminVisible}
        isAdminLoggedIn={visibility.isAdminLoggedIn}
        showAdminMenus={visibility.showAdminMenus}
        kakaoLoggedIn={visibility.kakaoLoggedIn}
        showOperatorLogout={visibility.canOperatorLogout}
        onLogout={onRequestLogout}
        logoutPending={isLogoutPending}
        onItemClick={onItemClick}
      />
    </>
  );
}
