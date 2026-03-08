import Link from "next/link";
import { Suspense } from "react";
import HomeLanding from "@/app/(components)/homeLanding.client";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";
import HomeRouteWarmup from "@/components/common/homeRouteWarmup";
import { createPageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";

export const revalidate = 60;
export const metadata = createPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "웰니스박스",
    "맞춤 영양제",
    "AI 건강 분석",
    "약사 상담",
    "건강기능식품 추천",
  ],
});

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

function HomeSearchHubSection() {
  const items = [
    {
      href: "/check-ai",
      title: "빠른 AI 검사",
      description: "1분 안에 건강 상태를 체크하고 맞춤 영양제 카테고리를 빠르게 확인해요.",
    },
    {
      href: "/assess",
      title: "정밀 AI 검사",
      description: "증상과 생활 습관을 더 자세히 입력해 개인 맞춤형 추천 근거를 살펴볼 수 있어요.",
    },
    {
      href: "/explore",
      title: "상품 둘러보기",
      description: "인기 영양 성분과 추천 상품을 비교하면서 나에게 맞는 조합을 찾아보세요.",
    },
    {
      href: "/column",
      title: "건강 칼럼",
      description: "비타민, 오메가3, 유산균, 철분 등 건강기능식품 복용 가이드를 읽어보세요.",
    },
    {
      href: "/health-link",
      title: "건강검진 연동",
      description: "건강 데이터를 연결해 더 정교한 건강 인사이트와 추천 근거를 확인할 수 있어요.",
    },
    {
      href: "/employee-report",
      title: "임직원 건강 리포트",
      description: "검진과 설문 데이터를 바탕으로 개인별 건강 리포트를 확인하는 B2B 전용 흐름입니다.",
    },
  ];

  return (
    <section className="w-full bg-white py-12 sm:py-14">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#4568F5]">
            WELLNESS NAVIGATION
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            처음 방문했다면 여기서 시작하세요
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            웰니스박스는 AI 건강 분석, 약사 검토, 맞춤 영양제 추천, 건강기능식품
            복용 가이드, 건강검진 연동 기능을 한 곳에서 제공합니다.
          </p>

          <nav aria-label="주요 서비스" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#4568F5] hover:shadow-[0_18px_40px_-30px_rgba(59,91,255,0.45)]"
              >
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#3450e5]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#4568F5]">
                  자세히 보기 →
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

async function PopularIngredientsSection({
  homeDataPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
}) {
  const { categories } = await homeDataPromise;
  return <PopularIngredientsNav basePath="/" initialCategories={categories} />;
}

async function SupplementRankingSection({
  homeDataPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
}) {
  const { rankingProducts } = await homeDataPromise;
  return (
    <SupplementRankingNav basePath="/" initialProducts={rankingProducts} />
  );
}

export default function HomePage() {
  const homeDataPromise = getHomePageData();

  return (
    <>
      <HomeRouteWarmup />
      <HomeLanding />
      <JourneyCtaBridge />
      <HomeSearchHubSection />
      <Suspense fallback={<CardSectionFallback />}>
        <PopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <SymptomImprovement />
      <Suspense fallback={<CardSectionFallback />}>
        <SupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<HomeProductsFallback />}>
        <HomeProductSectionServer homeDataPromise={homeDataPromise} />
      </Suspense>
    </>
  );
}
