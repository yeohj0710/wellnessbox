"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import PopularIngredients from "@/app/(components)/popularIngredients";
import { useLoading } from "@/components/common/loadingContext.client";

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

  const handleSelectCategory = (id: number) => {
    showLoading();
    startTransition(() => {
      router.push(`${basePath}?category=${id}#home-products`);
    });
  };

  return (
    <PopularIngredients
      onSelectCategory={handleSelectCategory}
      initialCategories={initialCategories}
    />
  );
}
