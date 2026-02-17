"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";

function toCartSignature(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      const productId = Number(item?.productId);
      const optionType =
        typeof item?.optionType === "string" ? item.optionType.trim() : "";
      const quantity = Number(item?.quantity);
      return `${Number.isFinite(productId) ? productId : 0}:${optionType}:${
        Number.isFinite(quantity) ? quantity : 0
      }`;
    })
    .sort()
    .join("|");
}

export function useCartHydration(
  cartItems: any[],
  onUpdateCart: (items: any[]) => void
) {
  const [hydrated, setHydrated] = useState(false);

  const onUpdateCartRef = useRef(onUpdateCart);
  const persistedSignatureRef = useRef("");

  useEffect(() => {
    onUpdateCartRef.current = onUpdateCart;
  }, [onUpdateCart]);

  useEffect(() => {
    const needRestore = localStorage.getItem("restoreCartFromBackup") === "1";
    const backup = localStorage.getItem("cartBackup");

    if (needRestore && backup && backup !== "[]") {
      try {
        const parsed = parseClientCartItems(JSON.parse(backup));
        if (parsed.length > 0) {
          onUpdateCartRef.current(parsed);
          writeClientCartItems(parsed);
          window.dispatchEvent(new Event("cartUpdated"));
          localStorage.removeItem("restoreCartFromBackup");
          localStorage.removeItem("checkoutInProgress");
          setHydrated(true);
          return;
        }
      } catch {}
    }

    try {
      const saved = localStorage.getItem("cartItems");
      if (saved && saved !== "[]") {
        const parsed = parseClientCartItems(JSON.parse(saved));
        if (parsed.length > 0) {
          onUpdateCartRef.current(parsed);
        }
      }
    } catch {}

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    if (restoring && cartItems.length === 0) return;
    if (cartItems.length === 0) {
      persistedSignatureRef.current = "";
      return;
    }

    const nextSignature = toCartSignature(cartItems);
    if (nextSignature === persistedSignatureRef.current) return;
    persistedSignatureRef.current = nextSignature;

    writeClientCartItems(cartItems);
    window.dispatchEvent(new Event("cartUpdated"));
  }, [hydrated, cartItems]);

  useEffect(() => {
    if (!hydrated) return;

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    if (!restoring) return;
    if (cartItems.length > 0) return;

    const backup = localStorage.getItem("cartBackup");
    if (!backup || backup === "[]") return;

    try {
      const parsed = parseClientCartItems(JSON.parse(backup));
      if (parsed.length > 0) {
        onUpdateCartRef.current(parsed);
        writeClientCartItems(parsed);
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch {}
  }, [hydrated, cartItems.length]);

  return hydrated;
}
