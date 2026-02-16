import { Suspense } from "react";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";

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

async function ExplorePopularIngredientsSection({
  homeDataPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
}) {
  const { categories } = await homeDataPromise;
  return (
    <PopularIngredientsNav basePath="/explore" initialCategories={categories} />
  );
}

async function ExploreSupplementRankingSection({
  homeDataPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
}) {
  const { rankingProducts } = await homeDataPromise;
  return (
    <SupplementRankingNav
      basePath="/explore"
      initialProducts={rankingProducts}
    />
  );
}

export default function ExplorePage() {
  const homeDataPromise = getHomePageData();

  return (
    <>
      <JourneyCtaBridge />
      <Suspense fallback={<CardSectionFallback />}>
        <ExplorePopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <SymptomImprovement />
      <Suspense fallback={<CardSectionFallback />}>
        <ExploreSupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<HomeProductsFallback />}>
        <HomeProductSectionServer homeDataPromise={homeDataPromise} />
      </Suspense>
    </>
  );
}
