import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { buildPharmRootCauseSummary } from "@/lib/pharm/root-cause-mining";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PharmRootCauseMiningCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildPharmRootCauseSummary(orders);
  if (!summary) return null;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Root Cause Mining
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

      <div className="mt-5 space-y-3">
        {summary.rootCauses.map((cause, index) => (
          <div
            key={cause.key}
            className="rounded-3xl bg-white/90 p-4 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-500">
                  근본 원인 {index + 1}
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {cause.label}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {cause.summary}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {cause.serviceArea}
              </span>
            </div>

            <div className="mt-3 text-xs font-medium text-slate-500">{cause.statLine}</div>

            {cause.products.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {cause.products.map((product) => (
                  <span
                    key={product}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {product}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-rose-700">대표 신호</div>
                <div className="mt-2 space-y-2">
                  {cause.sampleLines.map((line) => (
                    <p key={line} className="text-sm leading-6 text-slate-700">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <div className="text-xs font-semibold text-amber-800">재발 방지 액션</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {cause.preventionAction}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summary.structuralActions.length > 0 ? (
        <div className="mt-5 rounded-3xl bg-slate-950 px-5 py-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            재발 방지 우선순위
          </div>
          <div className="mt-3 space-y-2">
            {summary.structuralActions.map((action) => (
              <p key={action} className="text-sm leading-6 text-slate-100">
                {action}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
