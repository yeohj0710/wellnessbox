"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export function MenuLinks() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const checkLogin = () => {
      const accessPassword = Cookies.get("access_password");
      setIsLoggedIn(!!accessPassword);
    };
    checkLogin();
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
  const handleLogout = () => {
    Cookies.remove("access_password");
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
      {adminVisible && (
        <Link href="/admin-login" className={menuItemClasses()}>
          관리자 로그인
        </Link>
      )}
      {isLoggedIn ? (
        <>
          <Link href="/features" className={menuItemClasses()}>
            기능 테스트
          </Link>
          <Link href="/admin" className={menuItemClasses()}>
            상품 관리
          </Link>
          <button
            onClick={handleLogout}
            className={`${menuItemClasses()} text-left px-0`}
          >
            관리자 로그아웃
          </button>
        </>
      ) : null}
    </>
  );
}
