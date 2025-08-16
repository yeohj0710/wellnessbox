"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import HomeProductSection from "@/app/(components)/homeProductSection";

export default function ExplorePage() {
  const router = useRouter();
  const handleCategory = (id: number) =>
    router.push(`/explore?category=${id}#home-products`);
  const handleProduct = (id: number) =>
    router.push(`/explore?product=${id}#home-products`);
  return (
    <>
      <JourneyCtaBridge />
      <PopularIngredients onSelectCategory={handleCategory} />
      <SymptomImprovement />
      <SupplementRanking onProductClick={handleProduct} />
      <Suspense
        fallback={
          <div className="w-full max-w-[640px] mx-auto mt-2 bg-white p-6 text-center text-gray-500">
            상품을 불러오는 중이에요...
          </div>
        }
      >
        <HomeProductSection />
      </Suspense>
    </>
  );
}
