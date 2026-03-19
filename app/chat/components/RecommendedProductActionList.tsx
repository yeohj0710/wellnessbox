"use client";

import AutoDismissTimerBar from "@/components/common/AutoDismissTimerBar";
import {
  type ActionableRecommendation,
  type RecommendationLine,
  normalizeKey,
  toKrw,
} from "./recommendedProductActions.utils";

type RecommendedProductActionListProps = {
  parsed: RecommendationLine[];
  items: ActionableRecommendation[];
  loading: boolean;
  expanded: boolean;
  feedback: string;
  feedbackDurationMs: number;
  onToggleExpanded: () => void;
  onAddAll: () => void;
  onBuyAll: () => void;
  onAddSingle: (item: ActionableRecommendation) => void;
  onBuySingle: (item: ActionableRecommendation) => void;
};

export default function RecommendedProductActionList({
  parsed,
  items,
  loading,
  expanded,
  feedback,
  feedbackDurationMs,
  onToggleExpanded,
  onAddAll,
  onBuyAll,
  onAddSingle,
  onBuySingle,
}: RecommendedProductActionListProps) {
  const preview = items.slice(0, 2);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-slate-700">
            추천 상품 빠른 실행
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {loading
              ? "추천 상품 정보를 확인 중이에요."
              : `${items.length}개 상품을 바로 담거나 구매할 수 있어요.`}
          </p>
        </div>
        {!loading && items.length > 0 && (
          <button
            type="button"
            className="shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
            onClick={onToggleExpanded}
          >
            {expanded ? "접기" : "목록 보기"}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onAddAll}
          disabled={loading || items.length === 0}
          className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          전체 담기
        </button>
        <button
          type="button"
          onClick={onBuyAll}
          disabled={loading || items.length === 0}
          className="rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          전체 바로 구매
        </button>
      </div>

      {feedback ? (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-2.5 py-2">
          <p className="text-[11px] font-medium text-emerald-700">{feedback}</p>
          <AutoDismissTimerBar
            durationMs={feedbackDurationMs}
            className="mt-2"
            showCountdown={false}
            trackClassName="bg-emerald-100"
            barClassName="bg-gradient-to-r from-emerald-400 to-teal-400"
          />
        </div>
      ) : null}

      {!expanded && !loading && preview.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {preview.map((item, index) => (
            <span
              key={`${normalizeKey(item.category)}-${normalizeKey(item.productName)}-${index}`}
              className="max-w-[13rem] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
              title={item.productName}
            >
              {item.productName}
            </span>
          ))}
          {items.length > preview.length && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              +{items.length - preview.length}개
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {loading
            ? parsed.map((item, index) => (
                <div
                  key={`${normalizeKey(item.category)}-${normalizeKey(item.productName)}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <p className="text-[11px] font-medium text-slate-500">
                    {item.category}
                  </p>
                  <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                    {item.productName}
                  </p>
                  <div className="mt-1.5 h-6 w-28 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))
            : items.map((item, index) => (
                <div
                  key={`${normalizeKey(item.category)}-${normalizeKey(item.productName)}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <p className="text-[11px] font-medium text-slate-500">
                    {item.category}
                  </p>
                  <p className="line-clamp-1 text-[12px] font-semibold text-slate-900">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {`7일 기준 ${toKrw(item.sevenDayPrice)}`}
                    {` · 패키지 ${toKrw(item.packagePrice)}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    옵션: {item.optionType}
                    {item.capacity ? ` (${item.capacity})` : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddSingle(item)}
                      className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-white"
                    >
                      확인 후 담기
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuySingle(item)}
                      className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black"
                    >
                      바로 구매
                    </button>
                  </div>
                </div>
              ))}
        </div>
      )}
    </>
  );
}
