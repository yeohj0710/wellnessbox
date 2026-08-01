import { Suspense } from "react";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
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
    <PopularIngredientsNav
      basePath="/explore"
      initialCategories={categories}
      prioritizeImages
    />
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
    <div className="w-full overflow-x-hidden">
      <header className="mx-auto w-full max-w-[640px] px-4 pt-6">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#4568F5]">
          BROWSE
        </p>
        <h1 className="mt-2 break-keep text-[1.45rem] font-black leading-[1.2] tracking-tight text-slate-900">
          인기 성분과 영양제를 한 번에 둘러보세요
        </h1>
        <p className="mt-2 break-keep text-sm leading-6 text-slate-500">
          많이 찾는 성분부터 보고, 바로 제품으로 이어서 확인하실 수 있어요.
        </p>
      </header>
      <Suspense fallback={<CardSectionFallback />}>
        <ExplorePopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<CardSectionFallback />}>
        <ExploreSupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <div className="mt-6 sm:mt-8">
        <Suspense fallback={<HomeProductsFallback />}>
          <HomeProductSectionServer homeDataPromise={homeDataPromise} />
        </Suspense>
      </div>
      <SymptomImprovement />
    </div>
  );
}
