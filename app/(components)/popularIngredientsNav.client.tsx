"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import PopularIngredients from "@/app/(components)/popularIngredients";
import { useLoading } from "@/components/common/loadingContext.client";
import { enqueueRoutePrefetch } from "@/lib/navigation/prefetch";

interface PopularIngredientsNavProps {
  basePath: string;
  initialCategories?: any[];
}

export default function PopularIngredientsNav({
  basePath,
  initialCategories = [],
}: PopularIngredientsNavProps) {
  const router = useRouter();
  const { showLoading } = useLoading();
  const buildCategoryHref = useCallback(
    (id: number) => `${basePath}?category=${id}#home-products`,
    [basePath]
  );

  const handleSelectCategory = (id: number) => {
    const href = buildCategoryHref(id);
    showLoading();
    router.push(href);
  };

  const handleCategoryIntent = useCallback(
    (id: number) => {
      const href = buildCategoryHref(id);
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
