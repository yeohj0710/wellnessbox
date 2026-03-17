"use client";

import Link from "next/link";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import type { LoginStatus } from "@/lib/useLoginStatus";

export type MenuVisibility = {
  kakaoLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  showPharmMenus: boolean;
  showRiderMenus: boolean;
  showAdminMenus: boolean;
  canOperatorLogout: boolean;
};

export type LinkPressHandlers = {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onClick?: () => void;
};

const AI_PROMPT_BADGE = "가입없이 바로";
const BETA_LABEL = "BETA";

export const menuItemClasses = (additionalClasses = "") =>
  `relative shrink-0 whitespace-nowrap font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-gray-800 ${additionalClasses}`;

export function getMenuVisibility(loginStatus: LoginStatus | null): MenuVisibility {
  const kakaoLoggedIn = loginStatus?.isUserLoggedIn === true;
  const isPharmLoggedIn = loginStatus?.isPharmLoggedIn === true;
  const isRiderLoggedIn = loginStatus?.isRiderLoggedIn === true;
  const isAdminLoggedIn = loginStatus?.isAdminLoggedIn === true;
  const isTestLoggedIn = loginStatus?.isTestLoggedIn === true;

  return {
    kakaoLoggedIn,
    isAdminLoggedIn,
    showPharmMenus: isPharmLoggedIn,
    showRiderMenus: isRiderLoggedIn,
    showAdminMenus: isAdminLoggedIn,
    canOperatorLogout:
      isAdminLoggedIn || isPharmLoggedIn || isRiderLoggedIn || isTestLoggedIn,
  };
}

export function AiPromptBadge() {
  return (
    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-emerald-50 ring-1 ring-emerald-200">
      <span className="block px-3 py-1 text-center text-[10px] font-bold leading-none text-emerald-600 whitespace-nowrap">
        {AI_PROMPT_BADGE}
      </span>
    </span>
  );
}

export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex h-5 w-10 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 ${className}`}
    >
      {BETA_LABEL}
    </span>
  );
}

export function DrawerOperatorLinks({
  showPharmMenus,
  showRiderMenus,
  onItemClick,
}: {
  showPharmMenus: boolean;
  showRiderMenus: boolean;
  onItemClick?: () => void;
}) {
  return (
    <>
      {showPharmMenus && (
        <>
          <div className="mt-2 h-px bg-slate-100" />
          <Link href="/pharm" className={menuItemClasses()} onClick={onItemClick}>
            주문 관리
          </Link>
          <Link
            href="/pharm/manage-products"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
            상품 등록/관리
          </Link>
        </>
      )}

      {showRiderMenus && (
        <>
          <div className="mt-2 h-px bg-slate-100" />
          <Link href="/rider" className={menuItemClasses()} onClick={onItemClick}>
            배송 관리
          </Link>
        </>
      )}
    </>
  );
}

export function DesktopOperatorLinks({
  showPharmMenus,
  showRiderMenus,
  onItemClick,
}: {
  showPharmMenus: boolean;
  showRiderMenus: boolean;
  onItemClick?: () => void;
}) {
  return (
    <>
      {showPharmMenus && (
        <>
          <Link href="/pharm" className={menuItemClasses()} onClick={onItemClick}>
            주문 관리
          </Link>
          <Link
            href="/pharm/manage-products"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
            상품 등록/관리
          </Link>
        </>
      )}

      {showRiderMenus && (
        <Link href="/rider" className={menuItemClasses()} onClick={onItemClick}>
          배송 관리
        </Link>
      )}
    </>
  );
}

export function IdentityMenuLinks({
  adminVisible,
  isAdminLoggedIn,
  showAdminMenus,
  kakaoLoggedIn,
  showOperatorLogout,
  onLogout,
  logoutPending,
  onItemClick,
}: {
  adminVisible: boolean;
  isAdminLoggedIn: boolean;
  showAdminMenus: boolean;
  kakaoLoggedIn: boolean;
  showOperatorLogout: boolean;
  onLogout?: () => void;
  logoutPending?: boolean;
  onItemClick?: () => void;
}) {
  return (
    <>
      {adminVisible && !isAdminLoggedIn && (
        <Link href="/admin-login" className={menuItemClasses()} onClick={onItemClick}>
          관리자 로그인
        </Link>
      )}

      {showAdminMenus && (
        <Link href="/admin" className={menuItemClasses()} onClick={onItemClick}>
          관리자 페이지
        </Link>
      )}

      {kakaoLoggedIn && (
        <Link href="/me" className={menuItemClasses()} onClick={onItemClick}>
          내 정보
        </Link>
      )}

      {showOperatorLogout && (
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className={menuItemClasses(
            "inline-flex items-center text-left text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {logoutPending ? <InlineSpinnerLabel label="로그아웃 중" /> : "로그아웃"}
        </button>
      )}
    </>
  );
}
