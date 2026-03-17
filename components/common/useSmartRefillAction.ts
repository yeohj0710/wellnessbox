"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";
import {
  resolveSmartRefillAction,
  type SmartRefillAction,
  type SmartRefillBundleItem,
  type SmartRefillSurface,
} from "@/lib/refill-timing/engine";
import type { NormalizedAllResults } from "@/app/chat/hooks/useChat.results";
import { useRemoteUserContextSummary } from "./useRemoteUserContextSummary";

type CatalogProduct = {
  id: number;
  name: string;
  pharmacyProducts: Array<{
    optionType: string | null;
    stock: number | null;
  }>;
};

type ResolvedCartItem = {
  productId: number;
  productName: string;
  optionType: string;
  quantity: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function parseCatalogProducts(value: unknown): CatalogProduct[] {
  const root = asRecord(value);
  const products = Array.isArray(root?.products) ? root.products : [];

  return products
    .map((entry) => {
      const product = asRecord(entry);
      const id = asNumber(product?.id);
      const name = asString(product?.name);
      if (id == null || !name) return null;

      const pharmacyProducts = Array.isArray(product?.pharmacyProducts)
        ? product.pharmacyProducts
            .map((optionEntry) => {
              const option = asRecord(optionEntry);
              return {
                optionType: asString(option?.optionType) || null,
                stock: asNumber(option?.stock),
              };
            })
            .filter((option) => (option.stock ?? 0) > 0)
        : [];

      if (pharmacyProducts.length === 0) return null;

      return {
        id,
        name,
        pharmacyProducts,
      } satisfies CatalogProduct;
    })
    .filter((product): product is CatalogProduct => product !== null);
}

function findMatchingOption(
  options: CatalogProduct["pharmacyProducts"],
  targetOptionType: string | null
) {
  if (!targetOptionType) {
    return options[0]?.optionType || null;
  }

  const exact = options.find((option) => option.optionType === targetOptionType);
  if (exact?.optionType) return exact.optionType;

  const numberMatch = targetOptionType.match(/\d+/)?.[0];
  if (numberMatch) {
    const partial = options.find((option) =>
      (option.optionType || "").includes(numberMatch)
    );
    if (partial?.optionType) return partial.optionType;
  }

  return options[0]?.optionType || null;
}

function resolveCartItems(
  bundleItems: SmartRefillBundleItem[],
  catalogProducts: CatalogProduct[]
) {
  if (bundleItems.length === 0 || catalogProducts.length === 0) return [];

  const byName = new Map<string, CatalogProduct[]>();
  for (const product of catalogProducts) {
    const key = normalizeKey(product.name);
    const bucket = byName.get(key) || [];
    bucket.push(product);
    byName.set(key, bucket);
  }

  return bundleItems
    .map((item) => {
      const matches = byName.get(normalizeKey(item.productName)) || [];
      const product = matches[0];
      if (!product) return null;

      const optionType = findMatchingOption(product.pharmacyProducts, item.optionType);
      if (!optionType) return null;

      return {
        productId: product.id,
        productName: item.productName,
        optionType,
        quantity: Math.max(1, item.quantity),
      } satisfies ResolvedCartItem;
    })
    .filter((item): item is ResolvedCartItem => item !== null);
}

function openCartPanel() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("wbGlobalCartOpen", "1");
  localStorage.setItem("openCart", "true");
  window.dispatchEvent(new Event("openCart"));
}

export function useSmartRefillAction(params: {
  surface: SmartRefillSurface;
  orders: unknown[];
  enableRemoteContext?: boolean;
}) {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { loading, remoteResults, summary } = useRemoteUserContextSummary({
    enabled: params.enableRemoteContext === true,
  });

  const action = useMemo(
    () =>
      resolveSmartRefillAction({
        surface: params.surface,
        orders: params.orders,
        summary: params.enableRemoteContext ? summary : null,
      }),
    [params.surface, params.orders, params.enableRemoteContext, summary]
  );

  useEffect(() => {
    if (!action || action.ctaType !== "reorder" || action.bundleItems.length === 0) {
      setCatalogLoading(false);
      return;
    }
    if (catalogProducts.length > 0) return;

    const controller = new AbortController();
    let alive = true;
    setCatalogLoading(true);

    fetch("/api/home-data", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((payload) => {
        if (!alive) return;
        setCatalogProducts(parseCatalogProducts(payload));
      })
      .catch(() => {
        if (!alive) return;
        setCatalogProducts([]);
      })
      .finally(() => {
        if (!alive) return;
        setCatalogLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [action, catalogProducts.length]);

  const resolvedCartItems = useMemo(
    () =>
      action?.ctaType === "reorder"
        ? resolveCartItems(action.bundleItems, catalogProducts)
        : [],
    [action, catalogProducts]
  );

  const effectiveAction: SmartRefillAction | null = useMemo(() => {
    if (!action) return null;
    if (action.ctaType !== "reorder") return action;
    if (catalogLoading) return action;
    if (resolvedCartItems.length > 0) return action;

    return {
      ...action,
      ctaType: params.enableRemoteContext ? "consult" : "explore",
      ctaLabel: params.enableRemoteContext ? "약사와 먼저 점검하기" : "7일치부터 다시 보기",
      href: params.enableRemoteContext
        ? `/chat?from=${params.surface === "my-data" ? "my-data" : "orders"}`
        : "/?package=7#home-products",
      description: params.enableRemoteContext
        ? "이전 구성과 현재 판매 구성이 완전히 같지 않아, 이번에는 점검 후 필요한 조합만 다시 고르는 편이 안전해요."
        : "동일 옵션 재구성이 어려워 보여서, 부담이 낮은 7일치 상품부터 다시 시작하는 흐름으로 안내할게요.",
      helper: params.enableRemoteContext
        ? "약사 상담에서 최근 복약·건강 맥락까지 같이 보고 필요한 상품만 다시 담을 수 있어요."
        : "운영 상품 구성이 바뀐 경우에는 현재 판매 중인 7일치 옵션부터 다시 보는 편이 더 자연스러워요.",
    };
  }, [action, catalogLoading, resolvedCartItems.length, params.enableRemoteContext, params.surface]);

  const handlePrimaryAction = useCallback(() => {
    if (!effectiveAction || effectiveAction.ctaType !== "reorder") return;
    if (resolvedCartItems.length === 0 || typeof window === "undefined") return;

    const merged = mergeClientCartItems(readClientCartItems(), resolvedCartItems);
    writeClientCartItems(merged);
    window.dispatchEvent(new Event("cartUpdated"));
    openCartPanel();
    setFeedback(
      resolvedCartItems.length > 1
        ? `지난 주문 구성 ${resolvedCartItems.length}개를 장바구니에 다시 담았어요.`
        : `${resolvedCartItems[0]?.productName || "상품"}을(를) 장바구니에 다시 담았어요.`
    );
  }, [effectiveAction, resolvedCartItems]);

  return {
    action: effectiveAction,
    loading: loading || (action?.ctaType === "reorder" && catalogLoading),
    handlePrimaryAction,
    feedback,
  };
}
