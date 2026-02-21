import { writeClientCartItems } from "@/lib/client/cart-storage";

export function isBrowserOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export function requestCloseDock() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("wb:chat-close-dock"));
}

function clearCartOpenFlags() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("wbGlobalCartOpen");
  localStorage.removeItem("openCart");
  window.dispatchEvent(new Event("closeCart"));
}

export function navigateTo(path: string) {
  if (typeof window === "undefined") return false;
  clearCartOpenFlags();
  requestCloseDock();
  window.location.assign(path);
  return true;
}

export function openExternalLink(url: string) {
  if (typeof window === "undefined") return false;
  requestCloseDock();
  window.location.assign(url);
  return true;
}

export function openCartFromChat() {
  if (typeof window === "undefined") return;
  requestCloseDock();
  localStorage.setItem("openCart", "true");
  window.dispatchEvent(new Event("openCart"));
}

export function clearCartFromChat() {
  if (typeof window === "undefined") return;
  const cartWasOpen =
    sessionStorage.getItem("wbGlobalCartOpen") === "1" ||
    localStorage.getItem("openCart") === "true";
  writeClientCartItems([]);
  localStorage.removeItem("selectedPharmacyId");
  window.dispatchEvent(new Event("cartUpdated"));
  if (!cartWasOpen) {
    sessionStorage.removeItem("wbGlobalCartOpen");
    localStorage.removeItem("openCart");
  }
}
