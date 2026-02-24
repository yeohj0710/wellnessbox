"use client";

import { useEffect, useRef } from "react";
import { sortByImportanceDesc } from "@/lib/utils";
import {
  parseClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import type {
  FetchHomeData,
  SetAnyArray,
  SetBoolean,
  SetNumber,
  SetString,
} from "./homeProductSectionEffects.types";

export function useHomeProductLifecycleEffects(input: {
  initialCategories: any[];
  initialProducts: any[];
  setRoadAddress: SetString;
  setCategories: SetAnyArray;
  setAllProducts: SetAnyArray;
  setProducts: SetAnyArray;
  setIsLoading: SetBoolean;
  setIsRecovering: SetBoolean;
  fetchData: FetchHomeData;
  resetPharmacyState: () => void;
  setCartItems: SetAnyArray;
  setIsCartVisible: SetBoolean;
  setTotalPrice: SetNumber;
  roadAddress: string;
  cartItemsLength: number;
  isCartVisible: boolean;
  setIsAddressModalOpen: SetBoolean;
  isLoading: boolean;
  allProductsLength: number;
  isRecovering: boolean;
}) {
  const {
    initialCategories,
    initialProducts,
    setRoadAddress,
    setCategories,
    setAllProducts,
    setProducts,
    setIsLoading,
    setIsRecovering,
    fetchData,
    resetPharmacyState,
    setCartItems,
    setIsCartVisible,
    setTotalPrice,
    roadAddress,
    cartItemsLength,
    isCartVisible,
    setIsAddressModalOpen,
    isLoading,
    allProductsLength,
    isRecovering,
  } = input;
  const missingAddressPromptedRef = useRef(false);

  useEffect(() => {
    const timestampKey = "cartTimestamp";
    const now = Date.now();
    const storedTimestamp = localStorage.getItem(timestampKey);

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    const inCheckout = localStorage.getItem("checkoutInProgress") === "1";
    if (restoring || inCheckout) {
      localStorage.setItem(timestampKey, now.toString());
      return;
    }

    const staleMs = 7 * 24 * 60 * 60 * 1000;
    if (!storedTimestamp || now - parseInt(storedTimestamp, 10) > staleMs) {
      ["categories", "products", "cacheTimestamp"].forEach((key) =>
        localStorage.removeItem(key)
      );
    }
    localStorage.setItem(timestampKey, now.toString());
  }, []);

  useEffect(() => {
    const needRestore = localStorage.getItem("restoreCartFromBackup") === "1";
    const backup = localStorage.getItem("cartBackup");
    if (needRestore && backup && backup !== "[]") {
      try {
        const parsed = parseClientCartItems(JSON.parse(backup));
        if (parsed.length > 0) {
          setCartItems(parsed);
          writeClientCartItems(parsed);
          window.dispatchEvent(new Event("cartUpdated"));
        }
      } catch {}
    }
    localStorage.removeItem("restoreCartFromBackup");
    localStorage.removeItem("checkoutInProgress");
  }, [setCartItems]);

  useEffect(() => {
    const storedRoadAddress = localStorage.getItem("roadAddress") || "";
    setRoadAddress(storedRoadAddress.trim());

    if (initialCategories.length > 0 && initialProducts.length > 0) {
      const sortedCategories = sortByImportanceDesc(initialCategories);
      const sortedProducts = sortByImportanceDesc(initialProducts);
      const now = Date.now().toString();
      setCategories(sortedCategories);
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      setIsLoading(false);
      setIsRecovering(false);
      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", now);
      return;
    }
    void fetchData("initial");
  }, [
    fetchData,
    initialCategories,
    initialProducts,
    setAllProducts,
    setCategories,
    setIsLoading,
    setIsRecovering,
    setProducts,
    setRoadAddress,
  ]);

  useEffect(() => {
    const handleCleared = () => {
      setRoadAddress("");
      resetPharmacyState();
      setCartItems([]);
      setIsCartVisible(false);
      setTotalPrice(0);
      localStorage.removeItem("cartItems");
      localStorage.removeItem("openCart");
      window.dispatchEvent(new Event("cartUpdated"));
    };
    window.addEventListener("addressCleared", handleCleared);
    return () => window.removeEventListener("addressCleared", handleCleared);
  }, [
    resetPharmacyState,
    setCartItems,
    setIsCartVisible,
    setRoadAddress,
    setTotalPrice,
  ]);

  useEffect(() => {
    if (roadAddress.trim() || cartItemsLength === 0) {
      missingAddressPromptedRef.current = false;
      return;
    }
    if (!isCartVisible) return;
    if (missingAddressPromptedRef.current) return;

    missingAddressPromptedRef.current = true;
    setIsAddressModalOpen(true);
  }, [cartItemsLength, isCartVisible, roadAddress, setIsAddressModalOpen]);

  useEffect(() => {
    if (roadAddress) {
      localStorage.setItem("roadAddress", roadAddress);
    }
  }, [roadAddress]);

  useEffect(() => {
    if (isLoading) return;
    if (allProductsLength > 0 && !isRecovering) return;

    const timer = setTimeout(() => {
      void fetchData("recovery");
    }, 3500);
    return () => clearTimeout(timer);
  }, [allProductsLength, fetchData, isLoading, isRecovering]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      if (isLoading) return;
      if (allProductsLength > 0 && !isRecovering) return;
      void fetchData("recovery");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [allProductsLength, fetchData, isLoading, isRecovering]);
}
