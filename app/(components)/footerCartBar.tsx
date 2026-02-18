"use client";

import { useEffect, useRef } from "react";
import { useFooterCartDockAvoidance } from "@/app/(components)/footerCartDockAvoidance";

interface FooterCartBarProps {
  totalPrice: number;
  setIsCartVisible: (visible: boolean) => void;
}

const FOOTER_CART_BAR_LAYOUT_EVENT = "wb:footer-cart-bar-layout";
const FOOTER_CART_BAR_HEIGHT_CSS_VAR = "--wb-footer-cart-bar-height";
const FOOTER_CART_BAR_OFFSET_CSS_VAR = "--wb-footer-cart-bar-offset";
const MOBILE_TRIGGER_EXTRA_GAP = 12;

function syncFooterCartBarCssVars(height: number) {
  if (typeof document === "undefined") return;
  const safeHeight = Math.max(0, Math.round(height));
  const offset = safeHeight > 0 ? safeHeight + MOBILE_TRIGGER_EXTRA_GAP : 0;
  document.documentElement.style.setProperty(
    FOOTER_CART_BAR_HEIGHT_CSS_VAR,
    `${safeHeight}px`
  );
  document.documentElement.style.setProperty(
    FOOTER_CART_BAR_OFFSET_CSS_VAR,
    `${offset}px`
  );
}

export default function FooterCartBar({
  totalPrice,
  setIsCartVisible,
}: FooterCartBarProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { style, shouldHideForMobile } = useFooterCartDockAvoidance();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const emitLayout = () => {
      const height =
        shouldHideForMobile || !containerRef.current
          ? 0
          : Math.max(
              0,
              Math.round(containerRef.current.getBoundingClientRect().height)
            );
      syncFooterCartBarCssVars(height);
      window.dispatchEvent(
        new CustomEvent(FOOTER_CART_BAR_LAYOUT_EVENT, {
          detail: {
            visible: height > 0,
            height,
          },
        })
      );
    };

    emitLayout();

    const element = containerRef.current;
    const observer =
      element && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => emitLayout())
        : null;
    if (observer && element) {
      observer.observe(element);
    }
    window.addEventListener("resize", emitLayout);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", emitLayout);
      syncFooterCartBarCssVars(0);
      window.dispatchEvent(
        new CustomEvent(FOOTER_CART_BAR_LAYOUT_EVENT, {
          detail: { visible: false, height: 0 },
        })
      );
    };
  }, [shouldHideForMobile]);

  return (
    <div
      ref={containerRef}
      className={`px-5 fixed bottom-0 left-0 right-0 z-[46] w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold ${
        shouldHideForMobile ? "pointer-events-none" : "pointer-events-auto"
      }`}
      style={style}
    >
      <span>{totalPrice.toLocaleString()}원</span>
      <button
        ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setIsCartVisible(true);
          btnRef.current?.blur();
        }}
        className="bg-white text-sky-400 hover:bg-sky-100 transition px-6 py-2 rounded-full font-semibold focus:outline-none focus-visible:outline-none focus:ring-0"
      >
        장바구니 보기
      </button>
    </div>
  );
}
