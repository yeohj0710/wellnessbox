"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MenuLinks } from "./menuLinks";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";

export default function TopBar() {
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
    return `relative transition-transform duration-200 ease-in-out hover:scale-105 hover:text-sky-400 ${additionalClasses}`;
  };
  return (
    <>
      <header className="flex items-center justify-between fixed top-0 w-full bg-white z-40 h-14 shadow-sm px-6">
        <div className="flex items-center gap-6 menu-container">
          <Link
            href="/"
            className={menuItemClasses(
              "group text-lg font-bold flex flex-row gap-1.5 items-center"
            )}
          >
            <div className="relative w-9 h-9">
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
          <div className="hidden sm:flex gap-5">
            <MenuLinks loginStatus={loginStatus} />
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-0">
          {loginStatus.isTestLoggedIn && (
            <div className="bg-orange-400 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-white cursor-default">
                테스트
              </span>
            </div>
          )}
          <div className="flex items-center gap-6">
            <button
              className={menuItemClasses("text-xl block sm:hidden")}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-lg z-30 transform transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "170px" }}
      >
        <button className="p-4 text-2xl" onClick={closeDrawer}>
          ✕
        </button>
        <div className="flex flex-col p-6 gap-4">
          <MenuLinks loginStatus={loginStatus} />
        </div>
      </div>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-20"
          onClick={closeDrawer}
        />
      )}
    </>
  );
}
