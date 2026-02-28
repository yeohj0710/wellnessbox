"use client";

import { useEffect, useRef } from "react";
import { buildCategoryRecommendationToast } from "./homeProductSection.helpers";
import { resolvePackageFromQueryParam } from "./homeProductSection.copy";
import type { HomeCategory, HomeProduct } from "./homeProductSection.types";
import type {
  NumberRef,
  SearchParamReader,
  SetBoolean,
  SetNumberArray,
  SetNullableHomeProduct,
  SetString,
} from "./homeProductSectionEffects.types";

export function useHomeProductQuerySyncEffects(input: {
  searchParams: SearchParamReader;
  setSelectedPackage: SetString;
  categories: HomeCategory[];
  showToast: (message: string) => void;
  setSelectedCategories: SetNumberArray;
  allProducts: HomeProduct[];
  setSelectedProduct: SetNullableHomeProduct;
  hideLoading: () => void;
  scrollPositionRef: NumberRef;
  syncCartItemsFromStorage: () => void;
  setIsCartVisible: SetBoolean;
}) {
  const {
    searchParams,
    setSelectedPackage,
    categories,
    showToast,
    setSelectedCategories,
    allProducts,
    setSelectedProduct,
    hideLoading,
    scrollPositionRef,
    syncCartItemsFromStorage,
    setIsCartVisible,
  } = input;
  const toastShownRef = useRef(false);

  useEffect(() => {
    const resolvedPackage = resolvePackageFromQueryParam(
      searchParams.get("package")
    );
    if (resolvedPackage) {
      setSelectedPackage(resolvedPackage);
    }
  }, [searchParams, setSelectedPackage]);

  useEffect(() => {
    if (toastShownRef.current) return;
    const catsParam = searchParams.get("categories");
    const singleCat = searchParams.get("category");
    if (catsParam) {
      const ids = catsParam
        .split(",")
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n));
      setSelectedCategories(ids);
      if (categories.length) {
        showToast(
          buildCategoryRecommendationToast({
            categoryIds: ids,
            categories,
          })
        );
        toastShownRef.current = true;
      }
    } else if (singleCat) {
      const id = parseInt(singleCat, 10);
      if (!isNaN(id)) setSelectedCategories([id]);
    }
  }, [categories, searchParams, setSelectedCategories, showToast]);

  useEffect(() => {
    const productQuery = searchParams.get("product");
    if (productQuery && allProducts.length > 0) {
      const id = parseInt(productQuery, 10);
      const target = allProducts.find((product) => product.id === id);
      if (target) {
        const stored = sessionStorage.getItem("scrollPos");
        if (stored) scrollPositionRef.current = parseInt(stored, 10);
        setSelectedProduct(target);
      }
    }
  }, [allProducts, scrollPositionRef, searchParams, setSelectedProduct]);

  useEffect(() => {
    const cart = searchParams.get("cart");
    if (cart === "open") {
      hideLoading();
      const stored = sessionStorage.getItem("scrollPos");
      if (stored) scrollPositionRef.current = parseInt(stored, 10);
      localStorage.setItem("openCart", "true");
      syncCartItemsFromStorage();
      setIsCartVisible(true);
      const url = new URL(window.location.toString());
      url.searchParams.delete("cart");
      window.history.replaceState({}, "", url.toString());
    }
  }, [
    hideLoading,
    scrollPositionRef,
    searchParams,
    setIsCartVisible,
    syncCartItemsFromStorage,
  ]);
}
