"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLineItem } from "@/components/order/cart.types";
import {
  buildClientCartSignature,
  readClientCartItems,
} from "@/lib/client/cart-storage";

export function useSyncedClientCartItems() {
  const [cartItems, setCartItems] = useState<CartLineItem[]>(() =>
    typeof window !== "undefined" ? readClientCartItems() : []
  );
  const cartSignatureRef = useRef(
    typeof window !== "undefined"
      ? buildClientCartSignature(readClientCartItems())
      : ""
  );

  const setCartItemsIfChanged = useCallback((nextItems: CartLineItem[]) => {
    const nextSignature = buildClientCartSignature(nextItems);
    if (nextSignature === cartSignatureRef.current) {
      return false;
    }
    cartSignatureRef.current = nextSignature;
    setCartItems(nextItems);
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCart = () => {
      setCartItemsIfChanged(readClientCartItems());
    };

    syncCart();
    window.addEventListener("cartUpdated", syncCart);
    return () => window.removeEventListener("cartUpdated", syncCart);
  }, [setCartItemsIfChanged]);

  return {
    cartItems,
    setCartItemsIfChanged,
  };
}
