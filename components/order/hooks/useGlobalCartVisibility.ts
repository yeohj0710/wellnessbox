"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCartReturnState,
  isCartHostPath,
} from "@/lib/client/cart-navigation";
import {
  GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY,
  GLOBAL_CART_OPEN_KEY,
  notifyGlobalCartVisibility,
} from "@/components/order/globalCartHost.constants";

type UseGlobalCartVisibilityOptions = {
  canRenderGlobalCart: boolean;
  pathname: string | null;
};

export function useGlobalCartVisibility({
  canRenderGlobalCart,
  pathname,
}: UseGlobalCartVisibilityOptions) {
  const [isVisible, setIsVisible] = useState(false);
  const openScrollYRef = useRef(0);
  const openedPathRef = useRef<string | null>(null);

  const openGlobalCart = useCallback(() => {
    if (!canRenderGlobalCart || typeof window === "undefined") return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    window.dispatchEvent(new Event("wb:chat-close-dock"));
    clearCartReturnState();

    openScrollYRef.current = window.scrollY;
    openedPathRef.current = pathname || window.location.pathname;

    sessionStorage.setItem("scrollPos", String(window.scrollY));
    sessionStorage.setItem(GLOBAL_CART_OPEN_KEY, "1");
    localStorage.setItem(GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY, "true");

    setIsVisible(true);
    notifyGlobalCartVisibility(true);
  }, [canRenderGlobalCart, pathname]);

  const closeGlobalCart = useCallback(() => {
    openedPathRef.current = null;
    setIsVisible(false);

    if (typeof window === "undefined") return;

    sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
    localStorage.removeItem(GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY);
    notifyGlobalCartVisibility(false);

    const y = openScrollYRef.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpen = () => {
      if (isCartHostPath(window.location.pathname)) return;
      openGlobalCart();
    };

    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openGlobalCart]);

  useEffect(() => {
    if (!canRenderGlobalCart) {
      openedPathRef.current = null;
      setIsVisible(false);
      notifyGlobalCartVisibility(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(GLOBAL_CART_OPEN_KEY) !== "1") return;
    openGlobalCart();
  }, [canRenderGlobalCart, openGlobalCart]);

  useEffect(() => {
    if (!isVisible) return;
    const openedPath = openedPathRef.current;
    if (!openedPath || openedPath === pathname) return;

    openedPathRef.current = null;
    setIsVisible(false);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
      localStorage.removeItem(GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY);
      notifyGlobalCartVisibility(false);
    }
  }, [isVisible, pathname]);

  useEffect(() => {
    if (!isVisible) return;

    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [isVisible]);

  return {
    isVisible,
    closeGlobalCart,
  };
}
