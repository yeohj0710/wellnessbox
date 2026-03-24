import Link from "next/link";

type CatalogSectionEmptyStateProps = {
  badge: string;
  title: string;
  description: string;
};

export default function CatalogSectionEmptyState({
  badge,
  title,
  description,
}: CatalogSectionEmptyStateProps) {
  return (
    <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-[#d8e3ff] bg-[linear-gradient(145deg,rgba(244,248,255,0.98)_0%,rgba(255,255,255,0.99)_52%,rgba(244,241,255,0.98)_100%)] px-5 py-6 shadow-[0_24px_54px_-38px_rgba(76,93,198,0.34)] sm:px-6 sm:py-7">
        <div
          className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-[#6c4dff]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#3b82f6]/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <span className="inline-flex items-center rounded-full border border-[#cad9ff] bg-white/85 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#4568f5]">
            {badge}
          </span>

          <h3 className="mt-4 text-[1.28rem] font-black tracking-tight text-slate-900 sm:text-[1.48rem]">
            {title}
          </h3>
          <p className="mt-3 max-w-[33rem] text-sm leading-7 text-slate-600 sm:text-[15px]">
            {description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[#d9e2ff]">
              빠른 검사와 추천 흐름은 계속 이용하실 수 있어요
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/check-ai"
              className="inline-flex items-center rounded-full bg-[linear-gradient(90deg,#39a8f6_0%,#6c4dff_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_-20px_rgba(76,93,198,0.8)] transition hover:translate-y-[-1px]"
            >
              AI 추천 먼저 보기
            </Link>
            <Link
              href="/about/contact"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#bfd0ff] hover:text-[#4568f5]"
            >
              문의하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
