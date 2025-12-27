"use client";

import { useEffect, useRef, useState } from "react";

export function useCartHydration(
  cartItems: any[],
  onUpdateCart: (items: any[]) => void
) {
  const [hydrated, setHydrated] = useState(false);

  const onUpdateCartRef = useRef(onUpdateCart);

  useEffect(() => {
    onUpdateCartRef.current = onUpdateCart;
  }, [onUpdateCart]);

  useEffect(() => {
    const needRestore = localStorage.getItem("restoreCartFromBackup") === "1";
    const backup = localStorage.getItem("cartBackup");

    if (needRestore && backup && backup !== "[]") {
      try {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdateCartRef.current(parsed);
          localStorage.setItem("cartItems", backup);
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
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
    if (cartItems.length === 0) return;

    localStorage.setItem("cartItems", JSON.stringify(cartItems));
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
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateCartRef.current(parsed);
        localStorage.setItem("cartItems", backup);
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch {}
  }, [hydrated, cartItems.length]);

  return hydrated;
}
