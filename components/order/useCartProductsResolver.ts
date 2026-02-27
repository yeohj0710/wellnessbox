"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchJsonWithTimeout,
  FetchTimeoutError,
} from "@/lib/client/fetch-utils";
import { replaceCartWithPersistedNormalization } from "./cartItemsSection.actions";

type UseCartProductsResolverInput = {
  cartItems: any[];
  allProducts: any[];
  onUpdateCart: (items: any[]) => void;
};

export function useCartProductsResolver({
  cartItems,
  allProducts,
  onUpdateCart,
}: UseCartProductsResolverInput) {
  const [products, setProducts] = useState<any[]>(allProducts);
  const [cartProductsError, setCartProductsError] = useState<string | null>(
    null
  );
  const [resolveToken, setResolveToken] = useState(0);
  const [isResolvingProducts, setIsResolvingProducts] = useState(false);
  const onUpdateCartRef = useRef(onUpdateCart);

  useEffect(() => {
    onUpdateCartRef.current = onUpdateCart;
  }, [onUpdateCart]);

  useEffect(() => {
    if (Array.isArray(allProducts) && allProducts.length > 0) {
      setProducts(allProducts);
      setCartProductsError(null);
      setIsResolvingProducts(false);
      return;
    }

    const ids = Array.isArray(cartItems)
      ? Array.from(
          new Set(
            cartItems
              .map((item: any) => Number(item?.productId))
              .filter((id) => Number.isFinite(id) && id > 0)
          )
        )
      : [];

    if (ids.length === 0) {
      setProducts([]);
      setCartProductsError(null);
      setIsResolvingProducts(false);
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setCartProductsError(null);
    setIsResolvingProducts(true);

    (async () => {
      try {
        const { response, payload } = await fetchJsonWithTimeout<{
          products?: any[];
        }>(
          "/api/cart-products",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          },
          { timeoutMs: 7000, signal: controller.signal }
        );

        if (!alive) return;

        if (!response.ok || !Array.isArray(payload?.products)) {
          setProducts([]);
          setCartProductsError("장바구니 상품 정보를 불러오지 못했습니다.");
          return;
        }

        setProducts(payload.products);

        const resolvedProductIds = new Set<number>(
          payload.products
            .map((product: any) => Number(product?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        );

        if (resolvedProductIds.size === ids.length) return;

        const cleanedItems = cartItems.filter((item: any) =>
          resolvedProductIds.has(Number(item?.productId))
        );

        if (cleanedItems.length === cartItems.length) return;

        replaceCartWithPersistedNormalization(
          cleanedItems,
          onUpdateCartRef.current
        );
      } catch (error) {
        if (!alive) return;
        setProducts([]);

        if (error instanceof FetchTimeoutError) {
          setCartProductsError("장바구니 상품 조회 시간이 초과되었습니다.");
        } else {
          setCartProductsError("장바구니 상품 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (alive) setIsResolvingProducts(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [allProducts, cartItems, resolveToken]);

  const retryResolveProducts = useCallback(() => {
    setResolveToken((prev) => prev + 1);
  }, []);

  return {
    products,
    cartProductsError,
    isResolvingProducts,
    retryResolveProducts,
  };
}
