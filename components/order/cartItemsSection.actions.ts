import { writeClientCartItems } from "@/lib/client/cart-storage";
import type { CartLineItem } from "./cart.types";

type CartItemLike = CartLineItem;

function isSameLineItem(left: CartItemLike, right: CartItemLike) {
  return left.productId === right.productId && left.optionType === right.optionType;
}

function notifyCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("cartUpdated"));
}

export function persistCartItemsWithNotification(items: CartItemLike[]) {
  const normalized = writeClientCartItems(items);
  notifyCartUpdated();
  return normalized;
}

export function updateCartAndPersist(
  items: CartItemLike[],
  onUpdateCart: (items: CartItemLike[]) => void
) {
  onUpdateCart(items);
  persistCartItemsWithNotification(items);
}

export function replaceCartWithPersistedNormalization(
  items: CartItemLike[],
  onUpdateCart: (items: CartItemLike[]) => void
) {
  const normalized = persistCartItemsWithNotification(items);
  onUpdateCart(normalized);
}

export function buildDecrementedCartItems(
  cartItems: CartItemLike[],
  target: CartItemLike
) {
  return cartItems.map((item) =>
    isSameLineItem(item, target) && item.quantity > 1
      ? { ...item, quantity: item.quantity - 1 }
      : item
  );
}

export function buildIncrementedCartItems(
  cartItems: CartItemLike[],
  target: CartItemLike
) {
  return cartItems.map((item) =>
    isSameLineItem(item, target)
      ? { ...item, quantity: item.quantity + 1 }
      : item
  );
}

export function buildRemovedCartItems(
  cartItems: CartItemLike[],
  target: CartItemLike
) {
  return cartItems.filter((item) => !isSameLineItem(item, target));
}
