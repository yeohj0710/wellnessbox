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
  HomeCartItem,
  HomeCategory,
  HomePharmacy,
  HomeProduct,
} from "./homeProductSection.types";
import type {
  SetBoolean,
  SetHomeCartItemArray,
  SetHomeProductArray,
  SetNumber,
  SetNumberArray,
} from "./homeProductSectionEffects.types";

export function useHomeProductComputationEffects(input: {
  selectedPharmacy: HomePharmacy | null;
  cartItems: HomeCartItem[];
  allProducts: HomeProduct[];
  setTotalPrice: SetNumber;
  setIsCartBarLoading: SetBoolean;
  selectedSymptoms: string[];
  categories: HomeCategory[];
  setSelectedCategories: SetNumberArray;
  isLoading: boolean;
  setCartItems: SetHomeCartItemArray;
  deferredSelectedPackage: string;
  deferredSelectedCategories: number[];
  setProducts: SetHomeProductArray;
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
