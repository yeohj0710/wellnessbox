"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import ComingSoonPopup from "@/components/modal/comingSoonPopup";
import LandingSection2 from "./(components)/landingSection2";
import JourneyCtaBridge from "./(components)/journeyCtaBridge";

export default function Home() {
  const router = useRouter();
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  const handle7Day = () => router.push("/?package=7#home-products");
  const handleCategory = (id: number) =>
    router.push(`/?category=${id}#home-products`);
  const handleProduct = (id: number) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scrollPos", String(window.scrollY));
    }
    router.push(`/?product=${id}#home-products`, { scroll: false });
  };
  const handleSubscribe = () => setIsComingSoonOpen(true);

  return (
    <>
      <ComingSoonPopup
        open={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
      />
      <LandingSection2
        onSelect7Day={handle7Day}
        onSubscribe={handleSubscribe}
      />
      <JourneyCtaBridge />
      <PopularIngredients onSelectCategory={handleCategory} />
      <SymptomImprovement />
      <SupplementRanking onProductClick={handleProduct} />
      <HomeProductSection />
    </>
  );
}
