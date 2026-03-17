"use client";

export function focusOrderPasswordInput() {
  if (typeof document === "undefined") return;
  const input = document.getElementById("order-password") as
    | HTMLInputElement
    | null;
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus();
}
