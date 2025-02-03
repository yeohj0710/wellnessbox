"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export function MenuLinks() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPharmLoggedIn, setIsPharmLoggedIn] = useState(false);
  const [isRiderLoggedIn, setIsRiderLoggedIn] = useState(false);
  useEffect(() => {
    const accessPassword = Cookies.get("access_password");
    setIsLoggedIn(!!accessPassword);
    const pharmLoggedIn = Cookies.get("pharm_logged_in") === "true";
    setIsPharmLoggedIn(pharmLoggedIn);
    const riderLoggedIn = Cookies.get("rider_logged_in") === "true";
    setIsRiderLoggedIn(riderLoggedIn);
  }, []);
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
    window.location.reload();
  };
  return (
    <>
      <Link
        href="/about"
        className={menuItemClasses()}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        서비스 소개
      </Link>
      <Link href="/my-orders" className={menuItemClasses()}>
        내 주문 조회
      </Link>
      {isPharmLoggedIn && (
        <Link href="/pharm" className={menuItemClasses()}>
          주문 관리
        </Link>
      )}
      {isRiderLoggedIn && (
        <Link href="/rider" className={menuItemClasses()}>
          배송 관리
        </Link>
      )}
      {isPharmLoggedIn && (
        <Link href="/pharm/manage-products" className={menuItemClasses()}>
          상품 등록/관리
        </Link>
      )}
      {adminVisible && (
        <Link href="/admin-login" className={menuItemClasses()}>
          관리자 로그인
        </Link>
      )}
      {isLoggedIn ? (
        <Link href="/admin" className={menuItemClasses()}>
          데이터 관리
        </Link>
      ) : null}
      {(isLoggedIn || isPharmLoggedIn || isRiderLoggedIn) && (
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
