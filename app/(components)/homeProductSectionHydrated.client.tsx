"use client";

import dynamic from "next/dynamic";

interface HomeProductSectionHydratedProps {
  initialCategories: any[];
  initialProducts: any[];
}

const HomeProductSection = dynamic(
  () => import("@/app/(components)/homeProductSection"),
  {
    loading: () => (
      <div className="w-full max-w-[640px] mx-auto mt-2 mb-4 bg-white p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

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
