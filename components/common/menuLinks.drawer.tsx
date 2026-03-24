"use client";

import IntentPrefetchLink from "@/components/common/intentPrefetchLink";
import {
  AccessBadge,
  DrawerOperatorLinks,
  IdentityMenuLinks,
  menuItemClasses,
  TimeBadge,
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

const drawerItemClasses =
  "block rounded-lg px-3 py-2 leading-tight text-slate-800 hover:bg-slate-50";

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
        className={menuItemClasses("leading-tight")}
        {...pressHandlers}
      >
        상품 둘러보기
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/my-orders"
        className={menuItemClasses("leading-tight")}
        onClick={onItemClick}
      >
        내 주문 조회
      </IntentPrefetchLink>

      <div className="mt-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-emerald-400/80" aria-hidden="true" />
          <span className="text-sm font-bold tracking-[-0.01em] text-slate-700">진단 검사</span>
        </div>
      </div>

      <div className="mt-0 flex flex-col gap-0.5 pl-3">
        <IntentPrefetchLink
          href="/check-ai"
          className={`inline-flex items-center justify-between gap-3 ${drawerItemClasses}`}
          onClick={onItemClick}
        >
          <span>빠른 AI 검사</span>
          <TimeBadge>1분</TimeBadge>
        </IntentPrefetchLink>

        <IntentPrefetchLink
          href="/assess"
          className={`inline-flex items-center justify-between gap-3 ${drawerItemClasses}`}
          onClick={onItemClick}
        >
          <span>정밀 AI 검사</span>
          <TimeBadge>5~7분</TimeBadge>
        </IntentPrefetchLink>

        <IntentPrefetchLink
          href="/survey"
          className={`inline-flex items-center justify-between gap-3 ${drawerItemClasses}`}
          onClick={onItemClick}
        >
          <span>건강 설문</span>
          <TimeBadge>5~7분</TimeBadge>
        </IntentPrefetchLink>
      </div>

      <IntentPrefetchLink
        href="/chat"
        className={`${menuItemClasses("leading-tight")} mt-1.5 inline-flex items-center gap-2`}
        onClick={onItemClick}
      >
        <span>AI 맞춤 상담</span>
        <AccessBadge />
      </IntentPrefetchLink>

      <IntentPrefetchLink
        href="/column"
        className={`${menuItemClasses("leading-tight")} inline-flex items-center`}
        onClick={onItemClick}
      >
        <span>건강 칼럼</span>
      </IntentPrefetchLink>

      {visibility.isAdminLoggedIn && (
        <IntentPrefetchLink
          href="/employee-report"
          className={menuItemClasses("leading-tight")}
          onClick={onItemClick}
        >
          건강 레포트
        </IntentPrefetchLink>
      )}

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
