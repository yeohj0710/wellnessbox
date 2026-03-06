import Link from "next/link";
import type { ReactNode } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  CubeIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import ModelManager from "@/components/manager/modelManager";

function HubCard(props: {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  children?: ReactNode;
  tone?: "sky" | "emerald" | "slate";
}) {
  const toneClass =
    props.tone === "emerald"
      ? "from-emerald-50 via-white to-emerald-50/40"
      : props.tone === "slate"
      ? "from-slate-50 via-white to-slate-50/40"
      : "from-sky-50 via-white to-blue-50/40";

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br ${toneClass} p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.36)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
            {props.icon}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{props.title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{props.description}</p>
          </div>
        </div>

        {props.href && props.ctaLabel ? (
          <Link
            href={props.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {props.ctaLabel}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {props.children ? <div className="mt-5">{props.children}</div> : null}
    </section>
  );
}

function MiniToolCard(props: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  meta: string;
}) {
  return (
    <Link
      href={props.href}
      className="group overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.42)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_70px_-34px_rgba(14,116,144,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-sky-50 group-hover:text-sky-700">
          {props.icon}
        </div>
        <ArrowTopRightOnSquareIcon className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-sky-500" />
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{props.title}</h3>
        <p className="text-sm leading-6 text-slate-600">{props.description}</p>
      </div>

      <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
        {props.meta}
      </div>
    </Link>
  );
}

export default function AdminPage() {
  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_0%,rgba(125,211,252,0.7),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(191,219,254,0.72),transparent_26%),linear-gradient(180deg,#f7fbff_0%,#edf4fb_100%)]">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/88 px-6 py-8 shadow-[0_30px_90px_-44px_rgba(15,23,42,0.4)] backdrop-blur sm:px-8 sm:py-10">
          <div className="absolute -left-12 top-0 h-40 w-40 rounded-full bg-emerald-100/80 blur-3xl" />
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-700/75">
              Admin Dashboard
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-[3.25rem]">
                운영 대시보드
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                B2B 리포트 운영과 데이터 점검, AI 모델 조정, 상품 체계 관리까지 한곳에서 빠르게 접근할 수 있도록 운영 흐름 자체를 다시 정리했습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                운영 허브
              </span>
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                상품 UX 리빌드
              </span>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700">
                검색 · 정렬 · 전용 페이지
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <HubCard
            icon={<RectangleStackIcon className="h-5 w-5" />}
            title="B2B 운영 도구"
            description="레포트 운영과 임직원 데이터 관리는 즉시 진입 가능한 전용 동선으로 유지했습니다."
            tone="sky"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MiniToolCard
                icon={<RectangleStackIcon className="h-5 w-5" />}
                title="B2B 임직원 레포트 관리"
                description="설문, 분석, 코멘트, 레이아웃 점검과 PDF 내보내기를 관리합니다."
                href="/admin/b2b-reports"
                meta="리포트 운영"
              />
              <MiniToolCard
                icon={<CircleStackIcon className="h-5 w-5" />}
                title="B2B 임직원 데이터 운영"
                description="임직원 기본 정보와 운영 데이터를 직접 수정하고 검검합니다."
                href="/admin/b2b-employee-data"
                meta="데이터 운영"
              />
            </div>
          </HubCard>

          <HubCard
            icon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
            title="AI 모델 설정"
            description="챗봇, 제안, 리포트 분석, 요약, 에이전트 실행에 쓰이는 기본 응답 모델을 이곳에서 조정합니다."
            tone="emerald"
          >
            <ModelManager />
          </HubCard>
        </div>

        <HubCard
          icon={<BuildingStorefrontIcon className="h-5 w-5" />}
          title="상품 운영 워크스페이스"
          description="옛 카드형 모달 관리 화면을 전용 페이지형 운영 UX로 재설계했습니다. 검색, 정렬, 큰 편집 패널, 빠른 필터 중심으로 운영 속도를 높였습니다."
          tone="slate"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <MiniToolCard
              icon={<BuildingStorefrontIcon className="h-5 w-5" />}
              title="약국 상품 운영"
              description="약국별 판매 옵션, 가격, 재고를 검색과 정렬 중심으로 빠르게 관리합니다."
              href="/admin/pharmacy-products"
              meta="재고 · 가격 · 옵션"
            />
            <MiniToolCard
              icon={<CubeIcon className="h-5 w-5" />}
              title="상품 마스터 관리"
              description="공통 상품 정보와 카테고리 연결을 더 큰 편집 패널에서 정리합니다."
              href="/admin/products"
              meta="상품명 · 설명 · 이미지"
            />
            <MiniToolCard
              icon={<RectangleStackIcon className="h-5 w-5" />}
              title="카테고리 체계 관리"
              description="대표 이미지와 연결 상품 수를 보며 분류 체계를 안정적으로 운영합니다."
              href="/admin/categories"
              meta="분류 체계 · 대표 이미지"
            />
          </div>
        </HubCard>
      </div>
    </div>
  );
}
