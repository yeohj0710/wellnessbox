"use client";

import { useEffect, useRef } from "react";
import { useChatPageActionListener } from "@/lib/chat/useChatPageActionListener";
import { HOME_PRODUCT_COPY } from "./homeProductSection.copy";
import type {
  NumberRef,
  SetBoolean,
} from "./homeProductSectionEffects.types";

export function useHomeProductUiSyncEffects(input: {
  syncCartItemsFromStorage: () => void;
  setIsCartBarLoading: SetBoolean;
  setIsCartVisible: SetBoolean;
  scrollPositionRef: NumberRef;
  showToast: (message: string) => void;
  isLoading: boolean;
  hideLoading: () => void;
  openCart: () => void;
  totalPrice: number;
  isCartVisible: boolean;
  hideFooter: () => void;
  showFooter: () => void;
}) {
  const {
    syncCartItemsFromStorage,
    setIsCartBarLoading,
    setIsCartVisible,
    scrollPositionRef,
    showToast,
    isLoading,
    hideLoading,
    openCart,
    totalPrice,
    isCartVisible,
    hideFooter,
    showFooter,
  } = input;
  const didHashScrollRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      syncCartItemsFromStorage();
      setIsCartBarLoading(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "cartItems") return;
      sync();
    };

    sync();
    window.addEventListener("cartUpdated", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cartUpdated", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [setIsCartBarLoading, syncCartItemsFromStorage]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("openCart") === "true"
    ) {
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      syncCartItemsFromStorage();
      setIsCartVisible(true);
      localStorage.removeItem("openCart");
    }
  }, [scrollPositionRef, setIsCartVisible, syncCartItemsFromStorage]);

  useChatPageActionListener((detail) => {
    if (detail.action !== "focus_home_products") return;

    const target = document.getElementById("home-products");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(HOME_PRODUCT_COPY.movedToProductSection);
  });

  useEffect(() => {
    if (didHashScrollRef.current) return;
    if (typeof window === "undefined") return;
    if (isLoading) return;
    if (window.location.hash !== "#home-products") return;

    didHashScrollRef.current = true;
    document.getElementById("home-products")?.scrollIntoView();

    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
    hideLoading();
  }, [hideLoading, isLoading]);

  useEffect(() => {
    const handleOpen = () => openCart();
    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openCart]);

  useEffect(() => {
    if (totalPrice > 0 || isCartVisible) {
      hideFooter();
    } else {
      showFooter();
    }
  }, [hideFooter, isCartVisible, showFooter, totalPrice]);
}
