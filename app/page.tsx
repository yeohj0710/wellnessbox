"use client";

import HomeProductSection from "@/app/(components)/homeProductSection";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import LandingSection from "@/app/(components)/landingSection";
import ComingSoonPopup from "@/components/modal/comingSoonPopup";
import LandingSection2 from "./(components)/landingSection2";
import JourneyCtaBridge from "./(components)/journeyCtaBridge";

export default function Home() {
  return (
    <>
      {/* <ComingSoonPopup /> */}
      {/* <LandingSection /> */}
      <LandingSection2 />
      <JourneyCtaBridge />
      <PopularIngredients />
      <SymptomImprovement />
      <SupplementRanking />
      <HomeProductSection />
    </>
  );
}
