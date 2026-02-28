"use client";

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  clearCartReturnState,
  consumeCartReturnState,
  getCurrentPathWithSearchFromWindow,
  queueCartScrollRestore,
} from "@/lib/client/cart-navigation";
import type { HomeProduct } from "./homeProductSection.types";

type UseHomeProductActionsInput = {
  hideLoading: () => void;
  syncCartItemsFromStorage: () => void;
  scrollPositionRef: MutableRefObject<number>;
  setSelectedProduct: Dispatch<SetStateAction<HomeProduct | null>>;
  setIsCartVisible: Dispatch<SetStateAction<boolean>>;
  replaceRoute: (pathWithSearch: string) => void;
};

export function useHomeProductActions(input: UseHomeProductActionsInput) {
  const {
    hideLoading,
    syncCartItemsFromStorage,
    scrollPositionRef,
    setSelectedProduct,
    setIsCartVisible,
    replaceRoute,
  } = input;

  const restoreScroll = useCallback((y: number) => {
    const el = document.documentElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
    el.style.scrollBehavior = prev;
  }, []);

  const openProductDetail = useCallback(
    (product: HomeProduct) => {
      if (typeof window !== "undefined") {
        const y = window.scrollY;
        scrollPositionRef.current = y;
        sessionStorage.setItem("scrollPos", String(y));
      }
      setSelectedProduct(product);
    },
    [scrollPositionRef, setSelectedProduct]
  );

  const closeProductDetail = useCallback(() => {
    const y = scrollPositionRef.current;
    setSelectedProduct(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("product");
      window.history.replaceState({}, "", url.toString());
      sessionStorage.removeItem("scrollPos");
      requestAnimationFrame(() => restoreScroll(y));
    }
  }, [restoreScroll, scrollPositionRef, setSelectedProduct]);

  const openCart = useCallback(() => {
    if (typeof window !== "undefined") {
      clearCartReturnState();
      const y = window.scrollY;
      scrollPositionRef.current = y;
      sessionStorage.setItem("scrollPos", String(y));
      localStorage.setItem("openCart", "true");
    }
    syncCartItemsFromStorage();
    hideLoading();
    setIsCartVisible(true);
  }, [hideLoading, scrollPositionRef, setIsCartVisible, syncCartItemsFromStorage]);

  const closeCart = useCallback(() => {
    const y = scrollPositionRef.current;
    setIsCartVisible(false);
    if (typeof window === "undefined") return;

    localStorage.removeItem("openCart");

    const currentPathWithSearch = getCurrentPathWithSearchFromWindow();
    const returnState = consumeCartReturnState();

    const url = new URL(window.location.href);
    url.searchParams.delete("cart");
    window.history.replaceState({}, "", url.toString());
    sessionStorage.removeItem("scrollPos");

    if (
      returnState &&
      returnState.pathWithSearch &&
      returnState.pathWithSearch !== currentPathWithSearch
    ) {
      queueCartScrollRestore(returnState.pathWithSearch, returnState.scrollY);
      replaceRoute(returnState.pathWithSearch);
      return;
    }

    requestAnimationFrame(() => restoreScroll(y));
  }, [replaceRoute, restoreScroll, scrollPositionRef, setIsCartVisible]);

  return {
    openProductDetail,
    closeProductDetail,
    openCart,
    closeCart,
  };
}
