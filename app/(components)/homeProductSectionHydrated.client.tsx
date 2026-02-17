"use client";

import HomeProductSection from "@/app/(components)/homeProductSection";

interface HomeProductSectionHydratedProps {
  initialCategories: any[];
  initialProducts: any[];
}

export default function HomeProductSectionHydrated({
  initialCategories,
  initialProducts,
}: HomeProductSectionHydratedProps) {
  return (
    <HomeProductSection
      initialCategories={initialCategories}
      initialProducts={initialProducts}
    />
  );
}
