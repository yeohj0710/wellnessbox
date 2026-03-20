import { Suspense } from "react";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import ExploreAdaptiveEntryStack from "./ExploreAdaptiveEntryStack";
import type { ColumnSummary } from "@/app/column/_lib/columns-types";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import { getAllColumnSummaries } from "@/app/column/_lib/columns";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";

export const revalidate = 3600;

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

async function ExploreAdaptiveEntrySection({
  homeDataPromise,
  columnsPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
  columnsPromise: Promise<ColumnSummary[]>;
}) {
  const [{ categories }, columns] = await Promise.all([
    homeDataPromise,
    columnsPromise,
  ]);
  const normalizedCategories = categories
    .map((category) => ({
      id: category.id,
      name: category.name || "",
    }))
    .filter((category) => category.id > 0 && category.name);

  return (
    <ExploreAdaptiveEntryStack
      categories={normalizedCategories}
      columns={columns}
    />
  );
}

export default function ExplorePage() {
  const homeDataPromise = getHomePageData();
  const columnsPromise = getAllColumnSummaries();

  return (
    <>
      <JourneyCtaBridge />
      <Suspense fallback={null}>
        <ExploreAdaptiveEntrySection
          homeDataPromise={homeDataPromise}
          columnsPromise={columnsPromise}
        />
      </Suspense>
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
