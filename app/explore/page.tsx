'use client';

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import PopularIngredients from "@/app/(components)/popularIngredients";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import SupplementRanking from "@/app/(components)/supplementRanking";
import { useLoading } from "@/components/common/loadingContext.client";
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

export default function ExplorePage() {
  const router = useRouter();
  const { showLoading } = useLoading();
  const handleCategory = (id: number) => {
    showLoading();
    router.push(`/explore?category=${id}#home-products`);
  };
  const handleProduct = (id: number) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scrollPos", String(window.scrollY));
    }
    showLoading();
    router.push(`/explore?product=${id}#home-products`, { scroll: false });
  };
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
