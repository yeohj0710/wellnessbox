"use client";

import Link from "next/link";
import { useState } from "react";

interface MenuLinksProps {
  loginStatus: any;
  onItemClick?: () => void;
}

export function MenuLinks({ loginStatus, onItemClick }: MenuLinksProps) {
  const [adminVisible, setAdminVisible] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const menuItemClasses = (additionalClasses = "") =>
    `relative font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-sky-400 ${additionalClasses}`;
  const handlePressStart = () => {
    const timer = setTimeout(() => {
      setAdminVisible(true);
    }, 4000);
    setPressTimer(timer);
  };
  const handlePressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };
  const handleLogout = async () => {
    await fetch("/api/logout");
    if (onItemClick) onItemClick();
    window.location.href = "/";
  };
  const linkProps = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onClick: onItemClick,
  };
  return (
    <>
      <Link href="/explore" className={menuItemClasses()} {...linkProps}>
        상품 둘러보기
      </Link>
      <Link
        href="/my-orders"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        내 주문 조회
      </Link>
      <Link
        href="/check-ai"
        className={menuItemClasses()}
        onClick={onItemClick}
      >
        AI에게 추천받기
      </Link>
      {loginStatus.isPharmLoggedIn && (
        <Link href="/pharm" className={menuItemClasses()} onClick={onItemClick}>
          주문 관리
        </Link>
      )}
      {loginStatus.isRiderLoggedIn && (
        <Link href="/rider" className={menuItemClasses()} onClick={onItemClick}>
          배송 관리
        </Link>
      )}
      {loginStatus.isPharmLoggedIn && (
        <Link
          href="/pharm/manage-products"
          className={menuItemClasses()}
          onClick={onItemClick}
        >
          상품 등록/관리
        </Link>
      )}
      {adminVisible && (
        <Link
          href="/admin-login"
          className={menuItemClasses()}
          onClick={onItemClick}
        >
          관리자 로그인
        </Link>
      )}
      {loginStatus.isAdminLoggedIn ? (
        <Link href="/admin" className={menuItemClasses()} onClick={onItemClick}>
          데이터 관리
        </Link>
      ) : null}
      {(loginStatus.isPharmLoggedIn ||
        loginStatus.isRiderLoggedIn ||
        loginStatus.isAdminLoggedIn ||
        loginStatus.isTestLoggedIn) && (
        <button
          onClick={handleLogout}
          className={`${menuItemClasses()} text-left px-0`}
        >
          로그아웃
        </button>
      )}
    </>
  );
}
