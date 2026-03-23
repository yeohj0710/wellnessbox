import Link from "next/link";
import { Suspense } from "react";
import HomeLanding from "@/app/(components)/homeLanding.client";
import JourneyCtaBridge from "@/app/(components)/journeyCtaBridge";
import SymptomImprovement from "@/app/(components)/symptomImprovement";
import PopularIngredientsNav from "@/app/(components)/popularIngredientsNav.client";
import SupplementRankingNav from "@/app/(components)/supplementRankingNav.client";
import HomeProductSectionServer from "@/app/(components)/homeProductSection.server";
import { SITE_URL } from "@/lib/constants";
import { getHomePageData, type HomePageData } from "@/lib/product/home-data";
import HomeRouteWarmup from "@/components/common/homeRouteWarmup";
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
    title: "AI로 먼저 방향을 잡습니다",
    description:
      "빠른 체크부터 설문과 상담까지 연결해 지금 필요한 관리 우선순위를 정리합니다.",
  },
  {
    title: "복용 맥락까지 함께 봅니다",
    description:
      "현재 복용 중인 약, 생활 습관, 건강 데이터 흐름을 함께 보며 추천 이유를 이해하기 쉽게 설명합니다.",
  },
  {
    title: "읽고 끝나지 않게 돕습니다",
    description:
      "추천 이후에도 복용 가이드와 관련 콘텐츠를 이어 보여주어 실제 관리 루틴으로 연결합니다.",
  },
] as const;

const faqItems = [
  {
    question: "웰니스박스는 어떤 서비스를 제공하나요?",
    answer:
      "웰니스박스는 AI 기반 건강 점검, 맞춤형 건강기능식품 추천, 복용 가이드, 건강 콘텐츠를 연결해 건강관리 흐름을 돕는 서비스입니다.",
  },
  {
    question: "의료 진단을 대신하는 서비스인가요?",
    answer:
      "의료 진단을 대체하는 서비스는 아닙니다. 현재 상태를 정리하고 복용 및 생활 습관 정보를 이해하는 데 도움을 주는 방향으로 설계되어 있습니다.",
  },
  {
    question: "누가 운영하는지 확인할 수 있나요?",
    answer:
      "소개 페이지와 문의 페이지, 푸터에서 운영 사업자명, 통신판매업신고, 대표 연락처를 확인할 수 있습니다.",
  },
  {
    question: "복용 가이드는 어디서 볼 수 있나요?",
    answer:
      "건강 칼럼과 추천 흐름 안에서 비타민, 오메가3, 유산균, 철분 등 자주 찾는 건강기능식품의 복용 포인트를 확인할 수 있습니다.",
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
      description: "1분 안에 현재 상태를 가볍게 확인하고 추천 방향을 잡습니다.",
    },
    {
      href: "/assess",
      title: "정밀 AI 분석",
      description: "증상과 생활 정보를 더 자세히 입력해 개인 맞춤 추천 근거를 봅니다.",
    },
    {
      href: "/survey",
      title: "건강 설문",
      description: "생활 습관과 현재 상태를 정리해 이후 추천과 상담에 활용합니다.",
    },
    {
      href: "/chat",
      title: "AI 맞춤 상담",
      description: "추천 결과를 바탕으로 복용 루틴과 생활 관리 포인트를 이어서 확인합니다.",
    },
    {
      href: "/column",
      title: "건강 칼럼",
      description: "영양제 복용법과 주의 포인트를 콘텐츠로 빠르게 살펴봅니다.",
    },
    {
      href: "/my-orders",
      title: "내 주문 조회",
      description: "주문과 배송 상태를 확인하고 필요한 다음 행동을 이어갈 수 있습니다.",
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
                상품 둘러본 뒤 필요한 기능만 바로 이어서 쓰세요
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              검색, 설문, 상담, 주문 확인 같은 보조 기능을 한곳에 가볍게 모았습니다.
            </p>
          </div>

          <nav
            aria-label="주요 서비스"
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
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
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

function HomeTrustSection() {
  return (
    <section className="w-full bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-10 sm:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)] sm:p-7">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
              BASIC INFO
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              필요한 분만 확인하면 되는 운영 정보입니다
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              메인 탐색을 방해하지 않도록 운영 주체와 문의 정보는 한곳에 간결하게 모았습니다.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                운영 사업자: {BUSINESS_LEGAL_NAME}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                문의: {BUSINESS_SUPPORT_PHONE} / {BUSINESS_SUPPORT_EMAIL}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                통신판매업신고: {BUSINESS_MAIL_ORDER_REPORT_NUMBER}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                주소: {BUSINESS_ADDRESS}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
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
                문의/사업자 정보 보기
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {trustHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_40px_-40px_rgba(15,23,42,0.2)]"
              >
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFaqSection() {
  return (
    <section className="w-full bg-white pb-14 pt-4 sm:pb-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.22)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">FAQ</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                처음 보는 분들이 가장 많이 확인하는 내용
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              메인 구매 흐름 아래에 두고, 필요한 질문만 펼쳐서 볼 수 있게 정리했습니다.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white">
            {faqItems.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-slate-200 last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 text-left marker:content-none sm:px-6">
                  <div>
                    <span className="text-xs font-semibold tracking-[0.14em] text-sky-700">
                      Q{index + 1}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {item.question}
                    </h3>
                  </div>
                  <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition group-open:rotate-45 group-open:border-sky-200 group-open:text-sky-700">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 sm:px-6">
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
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
      <Suspense fallback={<CardSectionFallback />}>
        <PopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <Suspense fallback={<CardSectionFallback />}>
        <SupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <SymptomImprovement />
      <HomeSearchHubSection />
      <HomeTrustSection />
      <HomeFaqSection />
    </>
  );
}
