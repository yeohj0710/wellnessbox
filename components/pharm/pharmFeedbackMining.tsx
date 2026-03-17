import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { buildPharmFeedbackMiningSummary } from "@/lib/pharm/feedback-mining";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PharmFeedbackMiningCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildPharmFeedbackMiningSummary(orders);
  if (!summary) return null;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            피드백 마이닝
          </div>
          <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            {summary.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{summary.summary}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {summary.statBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-emerald-700">만족/재구매 포인트</div>
          <div className="mt-3 space-y-2">
            {summary.satisfactionDrivers.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-rose-700">불만/이탈 신호</div>
          <div className="mt-3 space-y-2">
            {summary.frictionDrivers.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-amber-700">이번 주 개선 액션</div>
          <div className="mt-3 space-y-2">
            {summary.actionItems.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {summary.watchItems.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {summary.watchItems.map((item) => (
            <div
              key={`${item.tone}-${item.label}-${item.detail}`}
              className={joinClassNames(
                "rounded-2xl px-4 py-3 ring-1",
                item.tone === "warn"
                  ? "bg-rose-50 ring-rose-100"
                  : "bg-emerald-50 ring-emerald-100"
              )}
            >
              <div
                className={joinClassNames(
                  "text-sm font-bold",
                  item.tone === "warn" ? "text-rose-800" : "text-emerald-800"
                )}
              >
                {item.label}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
