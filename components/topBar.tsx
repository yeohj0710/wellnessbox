"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MenuLinks } from "./menuLinks";

function menuItemClasses(additionalClasses = "") {
  return `relative transition-transform duration-200 ease-in-out hover:scale-105 hover:text-sky-400 ${additionalClasses}`;
}
export default function TopBar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
            <img
              src="/logo.png"
              alt="웰니스박스"
              ref={logoRef}
              className="w-[2em] h-[2em] object-contain group-hover:animate-bounce-custom"
            />
            웰니스박스
          </Link>
          <div className="hidden sm:flex gap-5">
            <MenuLinks />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            className={menuItemClasses("text-xl block sm:hidden")}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          >
            ☰
          </button>
        </div>
      </header>
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-lg z-40 transform transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "170px" }}
      >
        <button className="p-4 text-2xl" onClick={closeDrawer}>
          ✕
        </button>
        <div className="flex flex-col p-6 gap-4">
          <MenuLinks />
        </div>
      </div>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30"
          onClick={closeDrawer}
        />
      )}
    </>
  );
}
