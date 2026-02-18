"use client";

import { useEffect, useRef } from "react";
import { useFooterCartDockAvoidance } from "@/app/(components)/footerCartDockAvoidance";

const FOOTER_CART_BAR_LAYOUT_EVENT = "wb:footer-cart-bar-layout";

export default function FooterCartBarLoading() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { style, shouldHideForMobile } = useFooterCartDockAvoidance();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const emitLayout = () => {
      const height =
        shouldHideForMobile || !containerRef.current
          ? 0
          : Math.max(0, Math.round(containerRef.current.getBoundingClientRect().height));
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
      className={`px-5 fixed bottom-0 left-0 right-0 z-[46] w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-center items-center text-lg font-bold ${
        shouldHideForMobile ? "pointer-events-none" : "pointer-events-auto"
      }`}
      style={style}
    >
      <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
