import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import HomeAdaptiveSupportSectionClient from "@/app/(components)/HomeAdaptiveSupportSection.client";
import HomeColumnPreviewSection from "@/app/(components)/HomeColumnPreviewSection";
import HomeFaqList from "@/app/(components)/HomeFaqList.client";
import HomeLanding from "@/app/(components)/homeLanding.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import HomeSupportAccordion from "@/app/(components)/HomeSupportAccordion.client";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import HomeRouteWarmup from "@/components/common/homeRouteWarmup";
import { SITE_URL } from "@/lib/constants";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";
import { createPageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import {
  BUSINESS_ADDRESS,
  BUSINESS_LEGAL_NAME,
  BUSINESS_MAIL_ORDER_REPORT_NUMBER,
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE,
} from "@/lib/site-identity";

export const revalidate = 3600;
export const metadata = createPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "웰니스박스",
    "맞춤 영양제 추천",
    "AI 건강 분석",
    "건강기능식품 추천",
    "복용 가이드",
  ],
});

const trustHighlights = [
  {
    title: "AI가 먼저 큰 방향을 정리해드려요",
    description:
      "빠른 체크부터 설문, 상담까지 자연스럽게 이어지도록 구성해 지금 어떤 관리가 먼저 필요한지 한눈에 보실 수 있어요.",
  },
  {
    title: "복용 이유를 이해하기 쉽게 보여드려요",
    description:
      "지금 드시고 있는 약, 생활 습관, 건강 데이터 흐름까지 함께 보면서 왜 이런 추천이 나왔는지 납득하실 수 있게 설명해드려요.",
  },
  {
    title: "추천으로 끝나지 않게 이어드려요",
    description:
      "추천을 본 뒤에도 복용 가이드와 관련 콘텐츠를 이어서 확인하실 수 있어서 실제 루틴으로 이어가기 편해요.",
  },
] as const;

const faqItems = [
  {
    question: "웰니스박스에서는 어떤 도움을 받을 수 있나요?",
    answer:
      "웰니스박스는 AI 기반 건강 점검, 맞춤 건강기능식품 추천, 복용 가이드, 관련 콘텐츠를 한 흐름으로 연결해 건강 관리를 도와드리는 서비스입니다.",
  },
  {
    question: "의료 진단을 대신해주는 서비스인가요?",
    answer:
      "의료 진단을 대신하는 서비스는 아닙니다. 현재 상태와 생활 습관을 정리하고, 복용 방향을 이해하는 데 도움을 드리는 방식으로 운영하고 있습니다.",
  },
  {
    question: "누가 운영하는지 바로 확인할 수 있나요?",
    answer:
      "네. 소개 페이지와 문의 페이지에서 운영 사업자, 통신판매업 신고 정보, 연락처를 바로 확인하실 수 있습니다.",
  },
  {
    question: "복용 가이드는 어디에서 보면 되나요?",
    answer:
      "건강 관리 허브와 관련 콘텐츠에서 비타민, 오메가3, 유산균, 철분처럼 자주 찾는 성분별 복용 가이드를 확인하실 수 있습니다.",
  },
] as const;

function CardSectionFallback() {
  return (
    <section className="mx-auto mt-8 w-full max-w-[640px] px-3 sm:px-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-2xl bg-gray-100 ring-1 ring-gray-200"
          />
        ))}
      </div>
    </section>
  );
}

function PopularIngredientsSectionFallback() {
  return (
    <section className="mx-auto mt-8 w-full max-w-[640px]">
      <div className="px-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] bg-clip-text text-transparent">
            인기 성분
          </span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          많이 찾는 성분 구성을 차분하게 불러오고 있어요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.6rem] border border-[#E3EAFE] bg-white/90 shadow-[0_18px_40px_-34px_rgba(67,103,230,0.25)]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(120,150,255,0.16),transparent_55%),linear-gradient(180deg,#f9fbff_0%,#eef3ff_100%)]">
              <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(69,104,245,0.8)]">
                #{index + 1}
              </div>
              <div className="absolute right-4 top-4 h-11 w-11 animate-pulse rounded-2xl bg-white/80 ring-1 ring-white/70" />
              <div className="absolute left-4 top-[4.6rem] h-3 w-20 animate-pulse rounded-full bg-white/75" />
              <div className="absolute left-4 bottom-5 h-6 w-28 animate-pulse rounded-full bg-white/70" />
            </div>

            <div className="px-4 pb-4 pt-3">
              <div className="h-5 w-24 animate-pulse rounded-full bg-[#E9EEFF]" />
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#96A7FF]" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-[#EEF2FF]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeProductsFallback() {
  return (
    <div className="mx-auto mb-4 mt-2 flex w-full max-w-[640px] items-center justify-center bg-white p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

function HomeSearchHubSection() {
  const items = [
    {
      href: "/check-ai",
      title: "빠른 AI 체크",
      description:
        "1분 안에 현재 상태를 가볍게 확인하고 추천 방향을 먼저 살펴보실 수 있어요.",
    },
    {
      href: "/assess",
      title: "정밀 AI 분석",
      description:
        "증상과 생활 정보를 더 자세히 입력해 개인 맞춤 추천 근거를 확인하실 수 있어요.",
    },
    {
      href: "/survey",
      title: "건강 설문",
      description:
        "생활 습관과 현재 상태를 정리해두면 이후 추천과 상담 흐름이 더 자연스럽게 이어져요.",
    },
    {
      href: "/chat",
      title: "AI 맞춤 상담",
      description:
        "추천 결과를 바탕으로 복용 루틴과 생활 관리 포인트를 이어서 확인하실 수 있어요.",
    },
    {
      href: "/column",
      title: "건강 칼럼",
      description:
        "영양제 복용법과 주의할 점을 콘텐츠로 빠르게 살펴보실 수 있어요.",
    },
    {
      href: "/my-orders",
      title: "내 주문 조회",
      description:
        "주문과 배송 상태를 확인하고 필요한 다음 단계로 바로 이어가실 수 있어요.",
    },
  ];

  return (
    <section className="w-full bg-white py-10 sm:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.28)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#4568F5]">
                QUICK ACCESS
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                상품을 둘러본 뒤 필요한 기능만 바로 이어보세요
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              체크, 설문, 상담, 주문 확인처럼 자주 찾는 기능만 가볍게 모아두었습니다.
            </p>
          </div>

          <nav
            aria-label="주요 서비스 바로가기"
            className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.4rem] border border-slate-200 bg-white/95 p-4 transition hover:-translate-y-0.5 hover:border-[#4568F5] hover:shadow-[0_16px_36px_-28px_rgba(59,91,255,0.28)]"
              >
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#3450e5]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <span className="mt-3 inline-flex text-sm font-semibold text-[#4568F5]">
                  바로 가기
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

function BottomSupportSection({
  eyebrow,
  title,
  description,
  children,
  sectionClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  sectionClassName?: string;
}) {
  return (
    <HomeSupportAccordion
      eyebrow={eyebrow}
      title={title}
      description={description}
      sectionClassName={sectionClassName}
    >
      {children}
    </HomeSupportAccordion>
  );
}

function HomeTrustSection() {
  return (
    <BottomSupportSection
      eyebrow="BASIC INFO"
      title="운영 정보와 문의처를 한곳에 모아두었어요"
      description="회사 정보나 연락처가 필요하실 때 바로 확인하실 수 있도록 간단하게 정리해두었습니다."
    >
      <div className="space-y-3">
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            운영 사업자: {BUSINESS_LEGAL_NAME}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            문의: {BUSINESS_SUPPORT_PHONE} / {BUSINESS_SUPPORT_EMAIL}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            통신판매업 신고: {BUSINESS_MAIL_ORDER_REPORT_NUMBER}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            주소: {BUSINESS_ADDRESS}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/about"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            서비스 소개 보기
          </Link>
          <Link
            href="/about/contact"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            문의 / 사업자 정보 보기
          </Link>
        </div>

        <div className="grid gap-3">
          {trustHighlights.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_28px_-28px_rgba(15,23,42,0.22)]"
            >
              <h3 className="text-[15px] font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </BottomSupportSection>
  );
}

function HomeFaqSection() {
  return (
    <BottomSupportSection
      eyebrow="FAQ"
      title="처음 이용하실 때 많이 물어보시는 내용을 모아두었어요"
      description="메인 흐름을 먼저 보신 뒤, 궁금한 점만 빠르게 확인하실 수 있도록 정리했습니다."
      sectionClassName="pb-8 sm:pb-10 lg:pb-12"
    >
      <HomeFaqList items={faqItems} />
    </BottomSupportSection>
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

async function HomeBottomAdaptiveSection({
  homeDataPromise,
}: {
  homeDataPromise: Promise<HomePageData>;
}) {
  const { categories } = await homeDataPromise;
  return (
    <HomeAdaptiveSupportSectionClient
      categories={categories.map((category) => ({
        ...category,
        name: category.name ?? "",
      }))}
    />
  );
}

export default function HomePage() {
  const homeDataPromise = getHomePageData();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "웰니스박스 건강관리 서비스",
    serviceType: "AI 건강 분석 및 건강기능식품 추천 안내",
    provider: {
      "@type": "Organization",
      name: BUSINESS_LEGAL_NAME,
      url: SITE_URL,
    },
    areaServed: "KR",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <HomeRouteWarmup />
      <HomeLanding />
      <JourneyCtaBridge />
      <Suspense fallback={<HomeProductsFallback />}>
        <HomeProductSectionServer homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<PopularIngredientsSectionFallback />}>
        <PopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<CardSectionFallback />}>
        <SupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={null}>
        <HomeColumnPreviewSection />
      </Suspense>
      <SymptomImprovement />
      <HomeSearchHubSection />
      <Suspense fallback={null}>
        <HomeBottomAdaptiveSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <HomeTrustSection />
      <HomeFaqSection />
    </>
  );
}
