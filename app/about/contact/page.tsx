import Link from "next/link";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import {
  BUSINESS_ADDRESS,
  BUSINESS_LEGAL_NAME,
  BUSINESS_MAIL_ORDER_REPORT_NUMBER,
  BUSINESS_REGISTRATION_NUMBER,
  BUSINESS_REPRESENTATIVE_NAME,
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE,
} from "@/lib/site-identity";

export const metadata: Metadata = createPageMetadata({
  title: "문의하기 | 웰니스박스",
  description:
    "웰니스박스 고객센터 이메일, 대표 전화번호, 사업자 정보를 확인하고 문의 채널로 연결하세요.",
  path: "/about/contact",
  keywords: ["웰니스박스 문의", "웰니스박스 고객센터", "웰니스박스 사업자 정보"],
});

export default function Contact() {
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "웰니스박스 문의하기",
    url: "https://wellnessbox.kr/about/contact",
    about: {
      "@type": "Organization",
      name: BUSINESS_LEGAL_NAME,
      email: BUSINESS_SUPPORT_EMAIL,
      telephone: BUSINESS_SUPPORT_PHONE,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <section className="w-full bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_28%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.4)] sm:p-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">
              CONTACT WELLNESSBOX
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              문의 채널과 운영 정보를 한 페이지에서 확인하세요
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              서비스 이용, 주문, 사업자 정보 확인, 제휴 문의까지 이어질 수 있도록
              고객 접점과 운영 주체 정보를 함께 정리했습니다. 검색 사용자도 이
              페이지에서 웰니스박스가 누가 운영하는 서비스인지 바로 확인할 수
              있습니다.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#eef6ff_100%)] p-6">
                <p className="text-sm font-semibold text-slate-900">빠른 문의</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <a
                    href={`mailto:${BUSINESS_SUPPORT_EMAIL}`}
                    className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_16px_30px_-24px_rgba(37,99,235,0.55)] ring-1 ring-sky-100"
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] text-sky-700">
                      EMAIL
                    </p>
                    <p className="mt-2 break-all text-[1.05rem] font-bold leading-tight text-slate-900 sm:text-lg">
                      {BUSINESS_SUPPORT_EMAIL}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      전화 연결이 어려운 경우 메일을 남겨주시면 확인 후 답변드립니다.
                    </p>
                  </a>

                  <a
                    href={`tel:${BUSINESS_SUPPORT_PHONE.replaceAll("-", "")}`}
                    className="rounded-2xl bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">
                      PHONE
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {BUSINESS_SUPPORT_PHONE}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      대표 문의 번호입니다. 부재 중이면 문자 또는 메일을 함께 남겨주세요.
                    </p>
                  </a>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-slate-100">
                <p className="text-sm font-semibold text-sky-300">운영 주체</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
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
                    <span className="font-semibold text-white">통신판매업신고</span>
                    <br />
                    {BUSINESS_MAIL_ORDER_REPORT_NUMBER}
                  </p>
                  <p>
                    <span className="font-semibold text-white">사업장 주소</span>
                    <br />
                    {BUSINESS_ADDRESS}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">서비스 안내</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  웰니스박스가 어떤 흐름으로 건강관리 경험을 설계하는지 먼저
                  살펴보고 싶다면 소개 페이지를 확인해주세요.
                </p>
                <Link
                  href="/about"
                  className="mt-4 inline-flex text-sm font-semibold text-sky-700"
                >
                  소개 페이지 보기
                </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">건강 콘텐츠</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  복용 가이드, 생활 습관 팁, 주의할 상호작용 정보는 건강 칼럼에서
                  차분히 읽어볼 수 있습니다.
                </p>
                <Link
                  href="/column"
                  className="mt-4 inline-flex text-sm font-semibold text-sky-700"
                >
                  칼럼 보러 가기
                </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">빠른 시작</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  아직 어떤 관리가 필요한지 감이 안 잡힌다면, 1분 안에 끝나는 빠른
                  AI 검사부터 시작해보세요.
                </p>
                <Link
                  href="/check-ai"
                  className="mt-4 inline-flex text-sm font-semibold text-sky-700"
                >
                  빠른 AI 검사 시작
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
