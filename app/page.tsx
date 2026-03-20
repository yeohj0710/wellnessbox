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
      "빠른 검사와 단계형 설문으로 현재 상태를 정리하고, 어떤 건강관리 카테고리가 먼저 필요한지 좁혀갑니다.",
  },
  {
    title: "복용 맥락을 함께 봅니다",
    description:
      "복용 중인 약, 생활 습관, 건강 데이터처럼 추천 결과를 바꿀 수 있는 변수까지 고려하는 흐름을 지향합니다.",
  },
  {
    title: "읽을 수 있는 가이드를 남깁니다",
    description:
      "추천 후에도 복용 타이밍, 주의점, 생활 습관 팁을 칼럼과 안내 문구로 이어서 확인할 수 있게 구성합니다.",
  },
] as const;

const faqItems = [
  {
    question: "웰니스박스는 어떤 서비스를 제공하나요?",
    answer:
      "웰니스박스는 AI 기반 건강 점검, 맞춤형 건강기능식품 추천 흐름, 복용 가이드, 건강 칼럼을 연결해 건강관리 경험을 돕습니다.",
  },
  {
    question: "의료 진단 서비스인가요?",
    answer:
      "의료 진단을 대체하는 서비스는 아니며, 사용자가 현재 상태를 정리하고 복용 및 생활 습관 정보를 이해하는 데 도움을 주는 방향으로 설계되어 있습니다.",
  },
  {
    question: "누가 운영하는지 확인할 수 있나요?",
    answer:
      "웰니스박스 소개와 문의하기 페이지, 푸터에서 운영 사업자명, 사업자등록번호, 통신판매업신고, 대표 연락처를 확인할 수 있습니다.",
  },
  {
    question: "어디서 복용 가이드를 볼 수 있나요?",
    answer:
      "건강 칼럼에서 비타민, 오메가3, 유산균, 철분 등 자주 찾는 건강기능식품의 복용법과 주의 포인트를 확인할 수 있습니다.",
  },
] as const;

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
      href: "/survey",
      title: "건강 설문",
      description: "생활 습관과 현재 상태를 정리해두면 이후 검사와 상담에서 더 정확한 안내를 받을 수 있어요.",
    },
    {
      href: "/chat",
      title: "AI 맞춤 상담",
      description: "검사 결과나 지금 불편한 점을 바탕으로 복용 루틴과 생활 습관을 대화로 정리해보세요.",
    },
    {
      href: "/column",
      title: "건강 칼럼",
      description: "비타민, 오메가3, 유산균, 철분 등 건강기능식품 복용 가이드를 읽어보세요.",
    },
    {
      href: "/my-orders",
      title: "내 주문 조회",
      description: "주문한 상품의 상담, 조제, 배송 상태를 확인하고 진행 흐름을 이어서 관리할 수 있어요.",
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
            웰니스박스는 AI 건강 분석, 건강 설문, 맞춤 상담, 주문 조회, 건강 칼럼을 한 곳에서
            제공합니다.
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

function HomeTrustSection() {
  return (
    <section className="w-full bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.35)] sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
              TRUST SIGNALS
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              검색에서도 신뢰할 수 있는 서비스 구조를 드러냅니다
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              웰니스박스는 서비스 소개, 운영 사업자 정보, 고객 문의 채널, 건강
              콘텐츠를 공개 페이지에서 일관되게 보여주려고 합니다. 건강 관련
              서비스는 누가 운영하는지와 어떤 방식으로 안내하는지가 함께 보여야
              한다고 보기 때문입니다.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                운영 사업자: {BUSINESS_LEGAL_NAME}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                문의: {BUSINESS_SUPPORT_PHONE} · {BUSINESS_SUPPORT_EMAIL}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                통신판매업신고: {BUSINESS_MAIL_ORDER_REPORT_NUMBER}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                주소: {BUSINESS_ADDRESS}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)]"
              >
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
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
    <section className="w-full bg-white pb-14 pt-2 sm:pb-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-slate-100 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.7)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-300">FAQ</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            웰니스박스를 처음 찾은 분들이 자주 묻는 질문
          </h2>
          <div className="mt-6 grid gap-3">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <h3 className="text-lg font-bold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
              </article>
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
      <HomeSearchHubSection />
      <HomeTrustSection />
      <Suspense fallback={<CardSectionFallback />}>
        <PopularIngredientsSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <SymptomImprovement />
      <Suspense fallback={<CardSectionFallback />}>
        <SupplementRankingSection homeDataPromise={homeDataPromise} />
      </Suspense>
      <HomeFaqSection />
      <Suspense fallback={<HomeProductsFallback />}>
        <HomeProductSectionServer homeDataPromise={homeDataPromise} />
      </Suspense>
    </>
  );
}
