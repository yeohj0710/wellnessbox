"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import PopularIngredients from "@/app/(components)/popularIngredients";
import { useLoading } from "@/components/common/loadingContext.client";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";
import { enqueueRoutePrefetch } from "@/lib/navigation/prefetch";

interface PopularIngredientsNavProps {
  basePath: string;
  initialCategories?: any[];
}

type PopularCategoryTarget = number | string;

export default function PopularIngredientsNav({
  basePath,
  initialCategories = [],
}: PopularIngredientsNavProps) {
  const router = useRouter();
  const { showLoading } = useLoading();
  const buildCategoryHref = useCallback(
    (target: PopularCategoryTarget) => {
      const params = new URLSearchParams();
      params.set("category", String(target));
      return `${basePath}?${params.toString()}#home-products`;
    },
    [basePath]
  );

  const handleSelectCategory = (target: PopularCategoryTarget) => {
    const href = buildCategoryHref(target);
    showLoading();
    navigateWithFallback(router, href);
  };

  const handleCategoryIntent = useCallback(
    (target: PopularCategoryTarget) => {
      const href = buildCategoryHref(target);
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname || "/";
        if (currentPath === basePath) {
          return;
        }
      }
      enqueueRoutePrefetch(router, href);
    },
    [basePath, buildCategoryHref, router]
  );

  return (
    <PopularIngredients
      onSelectCategory={handleSelectCategory}
      onCategoryIntent={handleCategoryIntent}
      initialCategories={initialCategories}
    />
  );
}
