import {
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import type { ActionableRecommendation } from "./recommendedProductActions.types";

export function updateCartItems(items: ActionableRecommendation[]) {
  if (typeof window === "undefined" || items.length === 0) return;

  const additions = items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    optionType: item.optionType,
    quantity: 1,
  }));
  const merged = mergeClientCartItems(readClientCartItems(), additions);
  writeClientCartItems(merged);
  window.dispatchEvent(new Event("cartUpdated"));
}

export function hasSavedRoadAddress() {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("roadAddress");
  return typeof saved === "string" && saved.trim().length > 0;
}
