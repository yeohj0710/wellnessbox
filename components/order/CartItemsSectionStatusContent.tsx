"use client";

import CartItemRow from "./CartItemRow";
import { CART_ITEMS_SECTION_COPY } from "./cartItemsSection.copy";
import type { ResolvedCartItemRow } from "./cartItemsSection.view-model";
import type { CartLineItem, CartProduct } from "./cart.types";

type CartItemsSectionStatusContentProps = {
  resolving: boolean;
  cartProductsError: string | null;
  retryResolveProducts: () => void;
  missingPharmacy: boolean;
  pharmacyError: string | null;
  isAddressMissing: boolean;
  onOpenAddressModal?: () => void;
  onRetryResolve?: () => void;
  unresolvedItems: boolean;
  items: ResolvedCartItemRow[];
  cartItems: CartLineItem[];
  selectedPharmacyName?: string | null;
  onUpdateCart: (items: CartLineItem[]) => void;
  onProductClick: (product: CartProduct, optionType: string) => void;
};

export default function CartItemsSectionStatusContent({
  resolving,
  cartProductsError,
  retryResolveProducts,
  missingPharmacy,
  pharmacyError,
  isAddressMissing,
  onOpenAddressModal,
  onRetryResolve,
  unresolvedItems,
  items,
  cartItems,
  selectedPharmacyName,
  onUpdateCart,
  onProductClick,
}: CartItemsSectionStatusContentProps) {
  if (resolving) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b pb-4 animate-pulse"
          >
            <div className="w-16 h-16 rounded-md bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="w-6 h-4 bg-gray-200 rounded" />
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="w-8 h-8 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (cartProductsError) {
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-gray-600">{cartProductsError}</p>
        <button
          type="button"
          onClick={retryResolveProducts}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
        >
          {CART_ITEMS_SECTION_COPY.retryButtonLabel}
        </button>
      </div>
    );
  }

  if (missingPharmacy) {
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-gray-600">
          {typeof pharmacyError === "string" && pharmacyError
            ? pharmacyError
            : CART_ITEMS_SECTION_COPY.missingPharmacyFallback}
        </p>
        <button
          type="button"
          onClick={() => {
            if (isAddressMissing && typeof onOpenAddressModal === "function") {
              onOpenAddressModal();
              return;
            }
            onRetryResolve?.();
          }}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
        >
          {isAddressMissing
            ? CART_ITEMS_SECTION_COPY.addressSettingsLabel
            : CART_ITEMS_SECTION_COPY.retryButtonLabel}
        </button>
      </div>
    );
  }

  if (unresolvedItems) {
    return (
      <div className="flex h-28 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-gray-600">
          {CART_ITEMS_SECTION_COPY.unresolvedItemsMessage}
        </p>
        <button
          type="button"
          onClick={() => onRetryResolve?.()}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
        >
          {CART_ITEMS_SECTION_COPY.checkAgainLabel}
        </button>
      </div>
    );
  }

  if (items.length > 0) {
    return (
      <>
        {items.map((row) => (
          <CartItemRow
            key={row.key}
            row={row}
            cartItems={cartItems}
            selectedPharmacyName={selectedPharmacyName}
            onUpdateCart={onUpdateCart}
            onProductClick={onProductClick}
          />
        ))}
      </>
    );
  }

  return (
    <div className="flex justify-center items-center h-28">
      <p className="text-gray-500 font-medium">
        {CART_ITEMS_SECTION_COPY.emptyMessage}
      </p>
    </div>
  );
}
