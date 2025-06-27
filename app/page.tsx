"use client";

import HomeProductSection from "@/app/(components)/homeProductSection";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";

export default function Home() {
  return (
    <>
      <PopularIngredients />
      <SymptomImprovement />
      <SupplementRanking />
      <HomeProductSection />
    </>
  );
}
