import { loadAiExperimentSummary } from "@/lib/ai-experiments/service";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AiExperimentInsightsCard() {
  const summary = await loadAiExperimentSummary({
    experimentKey: "explore_education_entry_v1",
    windowDays: 14,
  });

  if (!summary) return null;

  const winningVariant =
    summary.variants.find((variant) => variant.key === summary.winningVariantKey)
      ?.label ?? "판단 보류";

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50/50 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.36)]">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700/75">
          AI Learning Loop
        </p>
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
          {summary.definition.title}
        </h2>
        <p className="text-sm leading-6 text-slate-600">{summary.definition.summary}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-white/80">
          <div className="text-xs font-bold text-slate-500">최근 {summary.windowDays}일 노출</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {summary.totalImpressions.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-white/80">
          <div className="text-xs font-bold text-slate-500">총 성공 이벤트</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {summary.totalSuccessEvents.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-white/80">
          <div className="text-xs font-bold text-slate-500">현재 우세 변형</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {winningVariant}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {summary.variants.map((variant) => (
          <div
            key={variant.key}
            className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.38)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500">변형</div>
                <div className="mt-1 text-lg font-black text-slate-950">
                  {variant.label}
                </div>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                CTR {formatPercent(variant.ctrPercent)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">노출</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {variant.impressions.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">성공 이벤트</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {variant.successEvents.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">주 CTA 클릭</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {variant.primaryClicks.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">보조/본문 클릭</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {(variant.secondaryClicks + variant.articleClicks).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] bg-slate-950 px-4 py-4 text-sm leading-6 text-slate-100">
        {summary.recommendation}
      </div>
    </section>
  );
}
