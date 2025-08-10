"use client";

import { useRouter } from "next/navigation";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import HomeProductSection from "@/app/(components)/homeProductSection";

export default function ExplorePage() {
  const router = useRouter();
  const handleCategory = (id: number) =>
    router.push(`/?category=${id}#home-products`);
  const handleProduct = (id: number) =>
    router.push(`/?product=${id}#home-products`);
  return (
    <>
      <JourneyCtaBridge />
      <PopularIngredients onSelectCategory={handleCategory} />
      <SymptomImprovement />
      <SupplementRanking onProductClick={handleProduct} />
      <HomeProductSection />
    </>
  );
}
