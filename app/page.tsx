import { Suspense } from "react";
import HomeLanding from "@/app/(components)/homeLanding.client";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import { getHomePageData } from "@/lib/product/home-data";
import HomeRouteWarmup from "@/components/common/homeRouteWarmup";

export const revalidate = 60;

function CardSectionFallback() {
  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 px-3 sm:px-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-44 rounded-2xl bg-gray-100 animate-pulse ring-1 ring-gray-200"
          />
        ))}
      </div>
    </section>
  );
}

function HomeProductsFallback() {
  return (
    <div className="w-full max-w-[640px] mx-auto mt-2 mb-4 bg-white p-6 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

async function PopularIngredientsSection() {
  const { categories } = await getHomePageData();
  return <PopularIngredientsNav basePath="/" initialCategories={categories} />;
}

async function SupplementRankingSection() {
  const { rankingProducts } = await getHomePageData();
  return (
    <SupplementRankingNav basePath="/" initialProducts={rankingProducts} />
  );
}

export default function HomePage() {
  return (
    <>
      <HomeRouteWarmup />
      <HomeLanding />
      <JourneyCtaBridge />
      <Suspense fallback={<CardSectionFallback />}>
        <PopularIngredientsSection />
      </Suspense>
      <SymptomImprovement />
      <Suspense fallback={<CardSectionFallback />}>
        <SupplementRankingSection />
      </Suspense>
      <Suspense fallback={<HomeProductsFallback />}>
        <HomeProductSectionServer />
      </Suspense>
    </>
  );
}
