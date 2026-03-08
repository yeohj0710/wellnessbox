"use client";

import { useCallback, useRef, useState } from "react";
import { sortByImportanceDesc } from "@/lib/utils";
import {
  fetchJsonWithTimeout,
  FetchTimeoutError,
  runWithRetry,
} from "@/lib/client/fetch-utils";
import {
  HOME_CACHE_TTL_MS,
  HOME_FETCH_RETRIES,
  HOME_FETCH_TIMEOUT_MS,
  HOME_STALE_CACHE_TTL_MS,
  type HomeDataResponse,
  readCachedHomeData,
} from "./homeProductSection.helpers";
import { HOME_PRODUCT_COPY } from "./homeProductSection.copy";
import type { HomeCategory, HomeProduct } from "./homeProductSection.types";
import type {
  SetHomeCategoryArray,
  SetHomeProductArray,
  SetBoolean,
} from "./homeProductSectionEffects.types";

type UseHomeProductSectionDataOptions = {
  initialCategories?: HomeCategory[];
  initialProducts?: HomeProduct[];
};

type UseHomeProductSectionDataResult = {
  categories: HomeCategory[];
  setCategories: SetHomeCategoryArray;
  products: HomeProduct[];
  setProducts: SetHomeProductArray;
  allProducts: HomeProduct[];
  setAllProducts: SetHomeProductArray;
  isLoading: boolean;
  setIsLoading: SetBoolean;
  error: string | null;
  isRecovering: boolean;
  setIsRecovering: SetBoolean;
  fetchData: (reason?: "initial" | "recovery") => Promise<void>;
};

export function useHomeProductSectionData({
  initialCategories = [],
  initialProducts = [],
}: UseHomeProductSectionDataOptions): UseHomeProductSectionDataResult {
  const [categories, setCategories] = useState<HomeCategory[]>(() =>
    sortByImportanceDesc(initialCategories)
  );
  const [products, setProducts] = useState<HomeProduct[]>(() =>
    sortByImportanceDesc(initialProducts)
  );
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<HomeProduct[]>(() =>
    sortByImportanceDesc(initialProducts)
  );
  const [isRecovering, setIsRecovering] = useState(false);
  const homeFetchSeqRef = useRef(0);

  const applyHomeData = useCallback(
    (
      nextCategories: HomeCategory[],
      nextProducts: HomeProduct[],
      cacheTimestamp = Date.now()
    ) => {
      const sortedCategories = sortByImportanceDesc(nextCategories);
      const sortedProducts = sortByImportanceDesc(nextProducts);
      setCategories(sortedCategories);
      setAllProducts(sortedProducts);
      setProducts(sortedProducts);
      localStorage.setItem("categories", JSON.stringify(sortedCategories));
      localStorage.setItem("products", JSON.stringify(sortedProducts));
      localStorage.setItem("cacheTimestamp", cacheTimestamp.toString());
    },
    []
  );

  const fetchData = useCallback(
    async (reason: "initial" | "recovery" = "initial"): Promise<void> => {
      const requestSeq = ++homeFetchSeqRef.current;
      setIsLoading(true);
      setError(null);
      if (reason === "recovery") setIsRecovering(true);

      const freshCache =
        typeof window === "undefined"
          ? null
          : readCachedHomeData(HOME_CACHE_TTL_MS);
      if (reason === "initial" && freshCache) {
        if (requestSeq === homeFetchSeqRef.current) {
          applyHomeData(
            freshCache.categories,
            freshCache.products,
            freshCache.cacheTimestamp
          );
          setIsLoading(false);
          setIsRecovering(false);
        }
        return;
      }

      const staleCache =
        typeof window === "undefined"
          ? null
          : readCachedHomeData(HOME_STALE_CACHE_TTL_MS);

      try {
        const result = await runWithRetry(
          async () => {
            const { response, payload } =
              await fetchJsonWithTimeout<HomeDataResponse>(
                "/api/home-data",
                {
                  method: "GET",
                  headers: { Accept: "application/json" },
                  cache: "no-store",
                },
                { timeoutMs: HOME_FETCH_TIMEOUT_MS }
              );

            const fetchedCategories = Array.isArray(payload?.categories)
              ? payload.categories
              : [];
            const fetchedProducts = Array.isArray(payload?.products)
              ? payload.products
              : [];

            if (!response.ok) {
              throw new Error(`home-data status ${response.status}`);
            }
            if (fetchedProducts.length === 0) {
              throw new Error("home-data empty products");
            }

            return { fetchedCategories, fetchedProducts };
          },
          {
            retries: HOME_FETCH_RETRIES,
            baseDelayMs: 800,
            maxDelayMs: 5000,
            shouldRetry: (requestError) => {
              return !(
                requestError instanceof DOMException &&
                requestError.name === "AbortError"
              );
            },
          }
        );

        if (requestSeq !== homeFetchSeqRef.current) return;
        applyHomeData(result.fetchedCategories, result.fetchedProducts);
        setIsRecovering(false);
      } catch (requestError) {
        if (requestSeq !== homeFetchSeqRef.current) return;
        console.error("Failed to load home data", requestError);

        if (staleCache) {
          applyHomeData(
            staleCache.categories,
            staleCache.products,
            staleCache.cacheTimestamp
          );
          setError(HOME_PRODUCT_COPY.connectionSlowUsingCache);
          setIsRecovering(true);
          return;
        }

        if (requestError instanceof FetchTimeoutError) {
          setError(HOME_PRODUCT_COPY.loadingTimeout);
        } else {
          setError(HOME_PRODUCT_COPY.loadFailed);
        }
      } finally {
        if (requestSeq === homeFetchSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [applyHomeData]
  );

  return {
    categories,
    setCategories,
    products,
    setProducts,
    allProducts,
    setAllProducts,
    isLoading,
    setIsLoading,
    error,
    isRecovering,
    setIsRecovering,
    fetchData,
  };
}
