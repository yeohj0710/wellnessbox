"use client";

import { useEffect } from "react";
import {
  calculateCartTotalForPharmacy,
  filterCartItemsByPharmacyStock,
  filterHomeProducts,
  HOME_SYMPTOM_CATEGORY_PAIRS,
  resolveCategoryIdsFromSymptoms,
} from "./homeProductSection.helpers";
import { writeClientCartItems } from "@/lib/client/cart-storage";
import type {
  SetAnyArray,
  SetBoolean,
  SetNumber,
  SetNumberArray,
} from "./homeProductSectionEffects.types";

export function useHomeProductComputationEffects(input: {
  selectedPharmacy: any;
  cartItems: any[];
  allProducts: any[];
  setTotalPrice: SetNumber;
  setIsCartBarLoading: SetBoolean;
  selectedSymptoms: string[];
  categories: any[];
  setSelectedCategories: SetNumberArray;
  isLoading: boolean;
  setCartItems: SetAnyArray;
  deferredSelectedPackage: string;
  deferredSelectedCategories: number[];
  setProducts: SetAnyArray;
}) {
  const {
    selectedPharmacy,
    cartItems,
    allProducts,
    setTotalPrice,
    setIsCartBarLoading,
    selectedSymptoms,
    categories,
    setSelectedCategories,
    isLoading,
    setCartItems,
    deferredSelectedPackage,
    deferredSelectedCategories,
    setProducts,
  } = input;

  useEffect(() => {
    if (!selectedPharmacy) {
      setTotalPrice(0);
      return;
    }
    const total = calculateCartTotalForPharmacy({
      cartItems,
      allProducts,
      selectedPharmacy,
    });
    setTotalPrice(total);
    setIsCartBarLoading(false);
  }, [
    allProducts,
    cartItems,
    selectedPharmacy,
    setIsCartBarLoading,
    setTotalPrice,
  ]);

  useEffect(() => {
    const resolvedCategoryIds = resolveCategoryIdsFromSymptoms({
      selectedSymptoms,
      categories,
      symptomCategoryPairs: HOME_SYMPTOM_CATEGORY_PAIRS,
    });
    if (resolvedCategoryIds.length === 0) return;
    setSelectedCategories(resolvedCategoryIds);
  }, [categories, selectedSymptoms, setSelectedCategories]);

  useEffect(() => {
    if (!selectedPharmacy) return;
    if (isLoading || allProducts.length === 0) return;

    const filteredCartItems = filterCartItemsByPharmacyStock({
      cartItems,
      allProducts,
      selectedPharmacy,
    });

    if (filteredCartItems.length !== cartItems.length) {
      const normalized = writeClientCartItems(filteredCartItems);
      setCartItems(normalized);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [allProducts, cartItems, isLoading, selectedPharmacy, setCartItems]);

  useEffect(() => {
    const filtered = filterHomeProducts({
      allProducts,
      selectedPharmacy,
      selectedPackage: deferredSelectedPackage,
      selectedCategoryIds: deferredSelectedCategories,
    });
    setProducts(filtered);
  }, [
    allProducts,
    deferredSelectedCategories,
    deferredSelectedPackage,
    selectedPharmacy,
    setProducts,
  ]);
}
