"use client";

import HomeProductSection from "@/app/(components)/homeProductSection";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import LandingSection from "@/app/(components)/landingSection";
import ComingSoonPopup from "@/components/modal/comingSoonPopup";

export default function Home() {
  return (
    <>
      <ComingSoonPopup />
      <LandingSection />
      <PopularIngredients />
      {/* <SymptomImprovement /> */}
      <SupplementRanking />
      <HomeProductSection />
    </>
  );
}
