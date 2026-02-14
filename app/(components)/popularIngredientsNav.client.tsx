"use client";

import { useCallback, useTransition } from "react";
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
  const [, startTransition] = useTransition();
  const buildCategoryHref = useCallback(
    (id: number) => `${basePath}?category=${id}#home-products`,
    [basePath]
  );

  const handleSelectCategory = (id: number) => {
    showLoading();
    startTransition(() => {
      router.push(buildCategoryHref(id));
    });
  };

  const handleCategoryIntent = useCallback(
    (id: number) => {
      enqueueRoutePrefetch(router, buildCategoryHref(id));
    },
    [buildCategoryHref, router]
  );

  return (
    <PopularIngredients
      onSelectCategory={handleSelectCategory}
      onCategoryIntent={handleCategoryIntent}
      initialCategories={initialCategories}
    />
  );
}
