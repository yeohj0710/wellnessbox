"use client";

export const MISSING_ADDRESS_ERROR =
  "주소를 설정해 주세요. 해당 상품을 주문할 수 있는 약국을 보여드릴게요.";

export const GLOBAL_CART_OPEN_KEY = "wbGlobalCartOpen";
export const GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY = "openCart";
export const GLOBAL_CART_VISIBILITY_EVENT = "wb:global-cart-visibility";

export function notifyGlobalCartVisibility(visible: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GLOBAL_CART_VISIBILITY_EVENT, {
      detail: { visible },
    })
  );
}
