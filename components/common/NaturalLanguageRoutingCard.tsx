"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import {
  resolveNaturalLanguageRoute,
  type NaturalLanguageRoutingCategory,
  type NaturalLanguageRoutingSurface,
} from "@/lib/natural-language-routing/engine";

type NaturalLanguageRoutingCardProps = {
  surface: NaturalLanguageRoutingSurface;
  categories: NaturalLanguageRoutingCategory[];
  className?: string;
  hideBehindBeta?: boolean;
};

const EXAMPLES: Record<NaturalLanguageRoutingSurface, string[]> = {
  home: [
    "요즘 눈이 뻑뻑하고 너무 피곤해",
    "병원약 먹는데 같이 먹어도 되는지 궁금해",
    "엄마가 피곤하다고 해서 대신 물어보고 싶어",
    "지난 주문 어디서 확인하지?",
  ],
  explore: [
    "처음인데 뭘 먼저 봐야 할지 모르겠어",
    "남편이랑 같이 시작하려는데 겹치지 않게 보고 싶어",
    "밤에 자주 깨고 눈이 건조해",
    "건강검진 결과부터 연결하고 싶어",
  ],
};

const PLACEHOLDER: Record<NaturalLanguageRoutingSurface, string> = {
  home: "예: 엄마가 피곤하다고 하는데 대신 물어보고 싶어",
  explore: "예: 남편이랑 같이 시작하려는데 겹치지 않게 보고 싶어",
};

export default function NaturalLanguageRoutingCard({
  surface,
  categories,
  className = "",
  hideBehindBeta = true,
}: NaturalLanguageRoutingCardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");

  const result = useMemo(
    () =>
      committedQuery
        ? resolveNaturalLanguageRoute({
            query: committedQuery,
            categories,
            surface,
          })
        : null,
    [categories, committedQuery, surface]
  );

  const submit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCommittedQuery(trimmed);
  };

  const content = (
    <section
      className={`mx-auto w-full max-w-[640px] px-3 sm:px-4 ${className}`.trim()}
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,1),rgba(248,250,252,0.94))] p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
            자연어 라우팅
          </span>
          <span className="text-xs text-slate-500">
            상품명이나 성분명을 몰라도 생활 고민 그대로 말하면 맞는 곳으로 보내드려요.
          </span>
        </div>

        <div className="mt-3">
          <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            어디로 가야 할지 모르겠다면 이렇게 말해보세요
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            검색보다 중요한 건 지금 이 고민이 탐색, 검사, 상담, 주문조회, 마이데이터 중 어디로 가야 덜 헤매는지예요.
          </p>
        </div>

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={PLACEHOLDER[surface]}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            맞는 곳 찾기
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES[surface].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                setCommittedQuery(example);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              {example}
            </button>
          ))}
        </div>

        {result ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
            {(() => {
              const secondaryAction = result.secondaryAction;

              return (
                <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-100">
                추천 경로
              </span>
              <span className="text-xs font-medium text-sky-700">
                {result.intentLabel}
              </span>
              {result.matchedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-medium text-sky-700"
                >
                  {label}
                </span>
              ))}
            </div>

            <p className="mt-3 text-base font-semibold text-slate-900">
              {result.headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {result.description}
            </p>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {result.reasonLines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push(result.primaryAction.href)}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {result.primaryAction.label}
              </button>
              {secondaryAction ? (
                <button
                  type="button"
                  onClick={() => router.push(secondaryAction.href)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {secondaryAction.label}
                </button>
              ) : null}
            </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return (
    <BetaFeatureGate
      title="Beta 자연어 길찾기"
    >
      {content}
    </BetaFeatureGate>
  );
}
