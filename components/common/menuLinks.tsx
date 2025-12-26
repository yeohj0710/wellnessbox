"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";

interface MenuLinksProps {
  loginStatus: any;
  onItemClick?: () => void;
  isDrawer?: boolean;
}

export function MenuLinks({
  loginStatus,
  onItemClick,
  isDrawer = false,
}: MenuLinksProps) {
  const [adminVisible, setAdminVisible] = useState(false);
  const [pressTimer, setPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDrawer) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!aiRef.current) return;
      if (!aiRef.current.contains(e.target as Node)) setAiOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isDrawer]);

  const menuItemClasses = (additionalClasses = "") =>
    `relative font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-gray-800 ${additionalClasses}`;

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

  const linkProps = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    onClick: onItemClick,
  };

  const anyLoggedIn =
    loginStatus.isUserLoggedIn ||
    loginStatus.isPharmLoggedIn ||
    loginStatus.isRiderLoggedIn ||
    loginStatus.isAdminLoggedIn ||
    loginStatus.isTestLoggedIn;

  if (isDrawer) {
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

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>AI 진단 검사</span>
          <span className="inline-flex rounded-full bg-emerald-50 ring-1 ring-emerald-200 max-w-[220px]">
            <span className="block w-full px-3 py-1 text-[10px] font-bold text-emerald-600 leading-tight text-center break-words">
              가입없이 바로
            </span>
          </span>
        </div>

        <Link
          href="/assess"
          className="-mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-slate-50"
          onClick={onItemClick}
        >
          <span>정밀 검사</span>
          <span className="flex items-center justify-center ml-1 rounded-full bg-indigo-100 w-10 h-5 text-[10px] font-bold text-indigo-600">
            BETA
          </span>
        </Link>

        <Link
          href="/check-ai"
          className="-mt-4 rounded-lg px-3 py-2 -mb-2 hover:bg-slate-50"
          onClick={onItemClick}
        >
          빠른 검사
        </Link>

        <Link
          href="/chat"
          className={`${menuItemClasses()} flex items-center mt-2`}
          onClick={onItemClick}
        >
          <span>AI 맞춤 상담</span>
          <span className="ml-2 flex items-center justify-center rounded-full bg-indigo-100 w-10 h-5 text-[10px] font-bold text-indigo-600">
            BETA
          </span>
        </Link>

        {loginStatus.isPharmLoggedIn && (
          <Link
            href="/pharm"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
            주문 관리
          </Link>
        )}

        {loginStatus.isRiderLoggedIn && (
          <Link
            href="/rider"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
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
          <Link
            href="/admin"
            className={menuItemClasses()}
            onClick={onItemClick}
          >
            사이트 관리
          </Link>
        ) : null}

        {anyLoggedIn ? (
          <Link href="/me" className={menuItemClasses()} onClick={onItemClick}>
            내 정보
          </Link>
        ) : null}
      </>
    );
  }

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

      <div className="relative flex items-center gap-2" ref={aiRef}>
        <button
          onClick={() => setAiOpen((v) => !v)}
          className="hover:text-gray-800 inline-flex items-center gap-1 font-semibold transition-transform duration-200 ease-in-out hover:scale-105"
          aria-haspopup="menu"
          aria-expanded={aiOpen}
        >
          <span className="inline-flex items-center gap-2">
            <span>AI 진단 검사</span>
            <span className="inline-flex rounded-full bg-emerald-50 ring-1 ring-emerald-200 max-w-[220px]">
              <span className="block w-full px-3 py-1 text-[10px] font-bold text-emerald-600 leading-tight text-center break-words">
                가입없이 바로
              </span>
            </span>
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${
              aiOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <Link
          href="/chat"
          className={menuItemClasses(
            "ml-1.5 inline-flex items-center gap-1 leading-none"
          )}
          onClick={onItemClick}
        >
          <span>AI 맞춤 상담</span>
          <span className="ml-0.5 flex items-center justify-center rounded-full bg-indigo-100 w-10 h-5 text-[10px] font-bold text-indigo-600">
            BETA
          </span>
        </Link>

        {aiOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 p-2">
            <Link
              href="/assess"
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
              onClick={() => {
                setAiOpen(false);
                if (onItemClick) onItemClick();
              }}
            >
              <span>정밀 검사</span>
              <span className="ml-2 flex items-center justify-center rounded-full bg-indigo-100 w-10 h-5 text-[10px] font-bold text-indigo-600">
                BETA
              </span>
            </Link>

            <Link
              href="/check-ai"
              className="block rounded-lg px-3 py-2 text-slate-800 hover:bg-slate-50"
              onClick={() => {
                setAiOpen(false);
                if (onItemClick) onItemClick();
              }}
            >
              빠른 검사
            </Link>
          </div>
        )}
      </div>

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

      {!isDrawer && !loginStatus.isUserLoggedIn && (
        <div className="hidden md:block">
          <KakaoLoginButton />
        </div>
      )}

      {loginStatus.isAdminLoggedIn ? (
        <Link href="/admin" className={menuItemClasses()} onClick={onItemClick}>
          사이트 관리
        </Link>
      ) : null}

      {anyLoggedIn ? (
        <Link href="/me" className={menuItemClasses()} onClick={onItemClick}>
          내 정보
        </Link>
      ) : null}
    </>
  );
}
