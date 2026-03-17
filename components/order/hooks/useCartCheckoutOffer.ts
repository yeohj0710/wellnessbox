"use client";

import { useCallback, useMemo } from "react";
import { useOfferIntelligence } from "@/components/common/useOfferIntelligence";
import {
  resolveCheckoutOfferCard,
  type OfferAction,
} from "@/lib/offer-intelligence/engine";
import { buildResolvedCartItemRows } from "../cartItemsSection.view-model";
import type {
  CartLineItem,
  CartPharmacy,
  CartProduct,
} from "../cart.types";

export function useCartCheckoutOffer(params: {
  cartItems: CartLineItem[];
  allProducts: CartProduct[];
  selectedPharmacy: CartPharmacy | null;
  totalPrice: number;
  onBulkChange: (targetOptionType: string) => void;
}) {
  const {
    cartItems,
    allProducts,
    selectedPharmacy,
    totalPrice,
    onBulkChange,
  } = params;
  const offerIntelligence = useOfferIntelligence(totalPrice > 0);

  const checkoutOfferItems = useMemo(
    () =>
      buildResolvedCartItemRows({
        cartItems,
        products: allProducts,
        selectedPharmacyId: selectedPharmacy?.id,
      }).map((row) => ({
        productId: row.product.id,
        name: row.product.name,
        optionType: row.pharmacyProduct.optionType,
        categories: (row.product.categories || [])
          .map((category) => category.name)
          .filter(Boolean),
      })),
    [allProducts, cartItems, selectedPharmacy?.id]
  );

  const checkoutOffer = useMemo(
    () =>
      !offerIntelligence.loading
        ? resolveCheckoutOfferCard({
            summary: offerIntelligence.summary,
            remoteResults: offerIntelligence.remoteResults,
            items: checkoutOfferItems,
            totalPrice,
          })
        : null,
    [
      checkoutOfferItems,
      offerIntelligence.loading,
      offerIntelligence.remoteResults,
      offerIntelligence.summary,
      totalPrice,
    ]
  );

  const handleCheckoutOfferAction = useCallback(
    (action: OfferAction) => {
      if (action.type !== "bulk_change") return;
      onBulkChange(action.target);
    },
    [onBulkChange]
  );

  return {
    checkoutOfferItems,
    checkoutOffer,
    offerSummary: offerIntelligence.summary,
    handleCheckoutOfferAction,
  };
}
