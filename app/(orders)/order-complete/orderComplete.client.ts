"use client";

import type { OrderRecord } from "./orderComplete.types";

export function clearOrderCompleteCartStorage() {
  localStorage.removeItem("cartItems");
  window.dispatchEvent(new Event("cartUpdated"));
}

export function restoreOrderCompleteCartBackup() {
  const backup = localStorage.getItem("cartBackup");
  if (backup && backup !== "[]") {
    localStorage.setItem("cartItems", backup);
    window.dispatchEvent(new Event("cartUpdated"));
  }
  localStorage.setItem("restoreCartFromBackup", "1");
  localStorage.setItem("openCart", "true");
}

export function syncOrderCompleteCustomerAccountKey(order: OrderRecord) {
  try {
    const fallbackPhone = `${localStorage.getItem("phonePart1") || ""}-${
      localStorage.getItem("phonePart2") || ""
    }-${localStorage.getItem("phonePart3") || ""}`;
    const normalizedPhone = String(order.phone || fallbackPhone || "").replace(
      /\D/g,
      ""
    );
    if (normalizedPhone) {
      localStorage.setItem("customerAccountKey", normalizedPhone);
    }
  } catch {}
}
