import Link from "next/link";
import {
  BUSINESS_ADDRESS,
  BUSINESS_CORPORATE_REGISTRATION_NUMBER,
  BUSINESS_INFO_ROWS,
  BUSINESS_LEGAL_NAME,
  BUSINESS_MAIL_ORDER_REPORT_NUMBER,
  BUSINESS_NAME,
  BUSINESS_REPRESENTATIVE_NAME,
  BUSINESS_REGISTRATION_NUMBER,
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE,
} from "@/lib/site-identity";

const principles = [
  {
    title: "빠르게 시작할 수 있어야 합니다",
    description:
      "건강관리 서비스는 첫걸음이 무거우면 오래 이어지기 어렵습니다. 웰니스박스는 빠른 AI 검사와 단계형 설문으로 시작 장벽을 낮춥니다.",
  },
  {
    title: "추천은 맥락까지 봐야 합니다",
    description:
      "같은 피로감이라도 수면, 스트레스, 복용 중인 약, 생활 패턴에 따라 필요한 안내가 달라질 수 있습니다. 그래서 단순 증상 나열보다 맥락을 중요하게 봅니다.",
  },
  {
    title: "구매보다 이해가 먼저입니다",
    description:
      "복용법, 주의 포인트, 생활 습관 조정 팁을 함께 읽을 수 있어야 실제 관리로 이어집니다. 칼럼과 상담 흐름은 이 이해를 돕기 위한 장치입니다.",
  },
] as const;

const processSteps = [
  {
    step: "1",
    title: "상태를 정리합니다",
    description:
      "빠른 AI 검사, 설문, 건강 데이터 연동 흐름으로 현재 상태와 우선순위를 정리합니다.",
  },
  {
    step: "2",
    title: "추천 방향을 좁힙니다",
    description:
      "답변 흐름과 복용 맥락을 바탕으로 어떤 카테고리의 도움이 먼저 필요한지 압축합니다.",
  },
  {
    step: "3",
    title: "복용과 생활 가이드로 이어갑니다",
    description:
      "추천 결과를 끝으로 두지 않고, 복용 시간대와 주의점, 읽어볼 칼럼까지 이어서 확인할 수 있게 설계합니다.",
  },
] as const;

const faqItems = [
  {
    question: "웰니스박스는 어떤 서비스인가요?",
    answer:
      "웰니스박스는 AI 건강 분석과 맞춤형 건강기능식품 추천, 복용 가이드, 건강 콘텐츠를 연결해 건강관리 경험을 돕는 서비스입니다.",
  },
  {
    question: "웰니스박스가 직접 상품을 판매하나요?",
    answer:
      "웰니스박스는 통신판매중개자로서 상품의 판매 당사자가 아니며, 실제 거래는 판매자와 구매자 간에 직접 이루어집니다.",
  },
  {
    question: "누가 운영하는 서비스인지 확인할 수 있나요?",
    answer:
      "이 페이지와 문의하기 페이지, 푸터에서 사업자 정보, 대표자, 연락처, 통신판매업신고 정보를 확인할 수 있습니다.",
  },
] as const;

export default function About() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `${BUSINESS_NAME} 소개`,
    url: "https://wellnessbox.me/about",
    description:
      "웰니스박스의 서비스 방향, 추천이 만들어지는 방식, 운영 주체와 고객 지원 정보를 소개합니다.",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: "https://wellnessbox.me/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "웰니스박스 소개",
        item: "https://wellnessbox.me/about",
      },
    ],
  };

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="w-full bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.16)_0%,_rgba(255,255,255,1)_42%),linear-gradient(180deg,#f8fbff_0%,#ffffff_34%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          <section className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/95 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.42)]">
            <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] text-sky-700">
                  ABOUT WELLNESSBOX
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                  몸 상태를 이해하고
                  <br />
                  복용 습관까지 이어지는
                  <br />
                  건강관리 흐름을 만듭니다
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  웰니스박스는 검사, 설문, 건강 데이터, 복용 가이드, 건강 칼럼을
                  따로 흩어놓지 않고 한 흐름으로 연결하려고 합니다. 검색 사용자도
                  이 페이지에서 서비스의 목적과 운영 주체를 한 번에 확인할 수
                  있도록 정보를 정리했습니다.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-sky-700">
                      START
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      1분 빠른 AI 검사
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      처음 방문한 사용자도 부담 없이 현재 상태를 점검할 수 있습니다.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">
                      GUIDE
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      복용 맥락까지 확인
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      복용 중인 약과 생활 습관이 추천을 바꿀 수 있다는 점을 반영합니다.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                    <p className="text-xs font-semibold tracking-[0.16em] text-sky-300">
                      OPERATOR
                    </p>
                    <p className="mt-2 text-lg font-bold">{BUSINESS_LEGAL_NAME}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      사업자 정보와 고객 접점을 공개해 신뢰 가능한 서비스 구조를
                      유지합니다.
                    </p>
                  </div>
                </div>
              </div>

              <aside className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] p-6 text-slate-100 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.75)]">
                <p className="text-sm font-semibold text-sky-300">운영 정보</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
                  <p>
                    <span className="font-semibold text-white">상호명</span>
                    <br />
                    {BUSINESS_LEGAL_NAME}
                  </p>
                  <p>
                    <span className="font-semibold text-white">대표자</span>
                    <br />
                    {BUSINESS_REPRESENTATIVE_NAME}
                  </p>
                  <p>
                    <span className="font-semibold text-white">사업자등록번호</span>
                    <br />
                    {BUSINESS_REGISTRATION_NUMBER}
                  </p>
                  <p>
                    <span className="font-semibold text-white">법인등록번호</span>
                    <br />
                    {BUSINESS_CORPORATE_REGISTRATION_NUMBER}
                  </p>
                  <p>
                    <span className="font-semibold text-white">통신판매업신고</span>
                    <br />
                    {BUSINESS_MAIL_ORDER_REPORT_NUMBER}
                  </p>
                  <p>
                    <span className="font-semibold text-white">문의</span>
                    <br />
                    {BUSINESS_SUPPORT_PHONE}
                    <br />
                    {BUSINESS_SUPPORT_EMAIL}
                  </p>
                  <p>
                    <span className="font-semibold text-white">주소</span>
                    <br />
                    {BUSINESS_ADDRESS}
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            {principles.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.35)]"
              >
                <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
                  HOW IT WORKS
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  추천이 만들어지는 흐름
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                건강 서비스는 질문 수보다 흐름 설계가 중요하다고 보고, 입력부터
                이해까지 단계적으로 연결하고 있습니다.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {processSteps.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                      {item.step}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
                PUBLIC SIGNALS
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                검색 사용자에게 바로 보여야 하는 정보
              </h2>
              <div className="mt-6 grid gap-3">
                {BUSINESS_INFO_ROWS.map((row) => (
                  <p
                    key={row}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {row}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                웰니스박스는 통신판매중개자로서 상품의 판매 당사자가 아니며,
                서비스 이용자가 운영 주체와 문의 창구를 쉽게 확인할 수 있도록
                공개 정보를 일관되게 제공합니다.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-7 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
                QUICK LINKS
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                처음 둘러볼 때 도움이 되는 경로
              </h2>
              <div className="mt-6 grid gap-3">
                <Link
                  href="/check-ai"
                  className="rounded-3xl border border-sky-100 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:border-sky-300"
                >
                  <p className="text-lg font-bold text-slate-900">빠른 AI 검사</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    1분 안에 현재 상태를 정리하고 추천 방향을 먼저 확인할 수 있습니다.
                  </p>
                </Link>
                <Link
                  href="/column"
                  className="rounded-3xl border border-slate-200 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:border-sky-300"
                >
                  <p className="text-lg font-bold text-slate-900">건강 칼럼</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    복용 가이드와 생활 습관 팁을 차분하게 읽고 싶은 사용자에게 적합합니다.
                  </p>
                </Link>
                <Link
                  href="/about/contact"
                  className="rounded-3xl border border-slate-200 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:border-sky-300"
                >
                  <p className="text-lg font-bold text-slate-900">문의 및 운영 정보</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    대표 연락처, 사업자 정보, 문의 채널을 한 페이지에서 확인할 수 있습니다.
                  </p>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-slate-100 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-300">
              FAQ
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              자주 묻는 질문
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
          </section>
        </div>
      </section>
    </>
  );
}
