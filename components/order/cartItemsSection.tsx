"use client";

import { useMemo } from "react";
import CartBulkChangeControls from "./CartBulkChangeControls";
import CartItemsSectionStatusContent from "./CartItemsSectionStatusContent";
import { CART_ITEMS_SECTION_COPY } from "./cartItemsSection.copy";
import {
  buildCartItemsSectionViewState,
  buildResolvedCartItemRows,
} from "./cartItemsSection.view-model";
import { useCartProductsResolver } from "./useCartProductsResolver";
import type {
  CartLineItem,
  CartPharmacy,
  CartProduct,
} from "./cart.types";

type CartItemsSectionProps = {
  cartItems: CartLineItem[];
  allProducts?: CartProduct[];
  selectedPharmacy: CartPharmacy | null;
  onUpdateCart: (items: CartLineItem[]) => void;
  onProductClick: (product: CartProduct, optionType: string) => void;
  handleBulkChange: (target: string) => void;
  isLoading?: boolean;
  isPharmacyLoading?: boolean;
  pharmacyError?: string | null;
  onRetryResolve?: () => void;
  isAddressMissing?: boolean;
  onOpenAddressModal?: () => void;
};

export default function CartItemsSection({
  cartItems,
  allProducts = [],
  selectedPharmacy,
  onUpdateCart,
  onProductClick,
  handleBulkChange,
  isLoading = false,
  isPharmacyLoading = false,
  pharmacyError = null,
  onRetryResolve,
  isAddressMissing = false,
  onOpenAddressModal,
}: CartItemsSectionProps) {
  const {
    products,
    cartProductsError,
    isResolvingProducts,
    retryResolveProducts,
  } = useCartProductsResolver({
    cartItems,
    allProducts,
    onUpdateCart,
  });

  const items = useMemo(
    () =>
      buildResolvedCartItemRows({
        cartItems,
        products,
        selectedPharmacyId: selectedPharmacy?.id,
      }),
    [cartItems, products, selectedPharmacy?.id]
  );

  const { resolving, missingPharmacy, unresolvedItems } = useMemo(
    () =>
      buildCartItemsSectionViewState({
        cartItemsCount: Array.isArray(cartItems) ? cartItems.length : 0,
        selectedPharmacyId: selectedPharmacy?.id,
        isLoading,
        isResolvingProducts,
        isPharmacyLoading,
        resolvedItemsCount: items.length,
      }),
    [
      cartItems,
      selectedPharmacy?.id,
      isLoading,
      isResolvingProducts,
      isPharmacyLoading,
      items.length,
    ]
  );

  return (
    <>
      <div className="px-4 sm:mt-2">
        <h2 className="text-lg font-bold pb-4 border-b mb-4 mt-4">
          {CART_ITEMS_SECTION_COPY.sectionTitle}
        </h2>
      </div>

      <div className="space-y-4 px-4 mb-2 min-h-28">
        <CartItemsSectionStatusContent
          resolving={resolving}
          cartProductsError={cartProductsError}
          retryResolveProducts={retryResolveProducts}
          missingPharmacy={missingPharmacy}
          pharmacyError={pharmacyError}
          isAddressMissing={isAddressMissing}
          onOpenAddressModal={onOpenAddressModal}
          onRetryResolve={onRetryResolve}
          unresolvedItems={unresolvedItems}
          items={items}
          cartItems={cartItems}
          selectedPharmacyName={selectedPharmacy?.name}
          onUpdateCart={onUpdateCart}
          onProductClick={onProductClick}
        />
      </div>

      <CartBulkChangeControls
        isVisible={!resolving && items.length > 0}
        onBulkChange={handleBulkChange}
      />
    </>
  );
}
