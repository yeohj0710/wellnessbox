"use client";

import Link from "next/link";
import type { LoginStatus } from "@/lib/useLoginStatus";

export type MenuVisibility = {
  kakaoLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  showPharmMenus: boolean;
  showRiderMenus: boolean;
  showAdminMenus: boolean;
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
  `relative font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-gray-800 ${additionalClasses}`;

export function getMenuVisibility(loginStatus: LoginStatus | null): MenuVisibility {
  const kakaoLoggedIn = loginStatus?.isUserLoggedIn === true;
  const isPharmLoggedIn = loginStatus?.isPharmLoggedIn === true;
  const isRiderLoggedIn = loginStatus?.isRiderLoggedIn === true;
  const isAdminLoggedIn = loginStatus?.isAdminLoggedIn === true;

  return {
    kakaoLoggedIn,
    isAdminLoggedIn,
    showPharmMenus: isPharmLoggedIn,
    showRiderMenus: isRiderLoggedIn,
    showAdminMenus: isAdminLoggedIn,
  };
}

export function AiPromptBadge() {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 ring-1 ring-emerald-200 max-w-[220px]">
      <span className="block w-full px-3 py-1 text-[10px] font-bold text-emerald-600 leading-tight text-center break-words">
        {AI_PROMPT_BADGE}
      </span>
    </span>
  );
}

export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-indigo-100 w-10 h-5 text-[10px] font-bold text-indigo-600 ${className}`}
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
  onItemClick,
}: {
  adminVisible: boolean;
  isAdminLoggedIn: boolean;
  showAdminMenus: boolean;
  kakaoLoggedIn: boolean;
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
        <>
          <Link href="/admin" className={menuItemClasses()} onClick={onItemClick}>
            사이트 관리
          </Link>
          <Link
            href="/admin/column/editor"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
            글쓰기
          </Link>
        </>
      )}

      {kakaoLoggedIn && (
        <Link href="/me" className={menuItemClasses()} onClick={onItemClick}>
          내 정보
        </Link>
      )}
    </>
  );
}
