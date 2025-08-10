"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenuLinks } from "./menuLinks";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";

export default function TopBar() {
  const router = useRouter();
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };
  const goSevenDays = () => {
    setIsDrawerOpen(false);
    router.push("/?package=7#home-products");
  };
  const logoRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      if (logoRef.current) {
        logoRef.current.classList.add("animate-bounce-custom");
        setTimeout(() => {
          logoRef.current?.classList.remove("animate-bounce-custom");
        }, 1200);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  const menuItemClasses = (additionalClasses = "") => {
    return `relative transition-transform duration-200 ease-in-out hover:scale-[1.02] ${additionalClasses}`;
  };
  return (
    <>
      <header className="fixed top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[120rem]">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={menuItemClasses(
                "group text-[17px] font-extrabold tracking-tight flex items-center gap-2"
              )}
            >
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="웰니스박스"
                  ref={logoRef}
                  fill
                  sizes="64px"
                  className="object-contain group-hover:animate-bounce-custom"
                />
              </div>
              웰니스박스
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-500 [&_a]:text-slate-500 [&_a:hover]:text-slate-900">
              <MenuLinks loginStatus={loginStatus} />
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {loginStatus.isTestLoggedIn && (
              <span className="hidden sm:inline-flex rounded-full bg-orange-400 px-3 py-1 text-xs font-bold text-white cursor-default">
                테스트
              </span>
            )}
            <button
              onClick={goSevenDays}
              className="hidden sm:block text-[15px] font-semibold text-slate-600"
            >
              7일 무료 체험
            </button>
            <Link
              href="/?package=7#home-products"
              className="inline-flex items-center rounded-full px-4 sm:px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,115,255,0.35)] hover:shadow-[0_12px_34px_rgba(86,115,255,0.45)] active:translate-y-[1px] transition"
            >
              시작하기
            </Link>
            <button
              className={menuItemClasses("text-2xl md:hidden ml-1")}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed top-0 right-0 z-30 h-full bg-white shadow-lg transform transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "260px" }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <span className="text-base font-semibold">메뉴</span>
          <button
            className="p-2 text-2xl"
            onClick={closeDrawer}
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col p-6 gap-4 text-[15px] font-medium text-slate-600 [&_a]:text-slate-700 [&_a]:hover:text-slate-900">
          <MenuLinks loginStatus={loginStatus} />
          <div className="mt-2 h-px bg-slate-100" />
          <button onClick={goSevenDays} className="text-left text-slate-500">
            7일 무료 체험
          </button>
          <Link
            href="/?package=7#home-products"
            onClick={closeDrawer}
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#59C1FF] to-[#7B61FF]"
          >
            시작하기
          </Link>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={closeDrawer} />
      )}
    </>
  );
}
