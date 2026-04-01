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
  const lastCategoryToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const resolvedPackage = resolvePackageFromQueryParam(
      searchParams.get("package")
    );
    if (resolvedPackage) {
      setSelectedPackage(resolvedPackage);
    }
  }, [searchParams, setSelectedPackage]);

  useEffect(() => {
    const catsParam = searchParams.get("categories");
    const singleCat = searchParams.get("category");

    if (catsParam) {
      const ids = Array.from(
        new Set(
          catsParam
        .split(",")
        .map((n) => parseInt(n, 10))
            .filter((n) => !isNaN(n))
        )
      );
      if (ids.length === 0) return;

      setSelectedCategories(ids);

      if (categories.length) {
        const toastKey = `categories:${ids.join(",")}`;
        if (lastCategoryToastKeyRef.current !== toastKey) {
          showToast(
            buildCategoryRecommendationToast({
              categoryIds: ids,
              categories,
            })
          );
          lastCategoryToastKeyRef.current = toastKey;
        }
      }
      return;
    }

    lastCategoryToastKeyRef.current = null;

    if (singleCat) {
      const id = parseInt(singleCat, 10);
      if (!isNaN(id)) {
        setSelectedCategories([id]);
        return;
      }

      if (categories.length > 0) {
        const normalizedSingleCat = singleCat.trim().toLowerCase();
        const normalizedSingleCatCompact = normalizedSingleCat.replace(/\s+/g, "");
        const matched = categories.find((category) => {
          const normalizedName = category.name.trim().toLowerCase();
          return (
            normalizedName === normalizedSingleCat ||
            normalizedName.replace(/\s+/g, "") === normalizedSingleCatCompact
          );
        });

        if (matched) {
          setSelectedCategories([matched.id]);
        }
      }
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
