import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";
import {
  buildPharmHumanPriority,
  buildPharmHumanPriorityQueueSummary,
} from "@/lib/pharm/human-priority";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getTierStyle(tier: ReturnType<typeof buildPharmHumanPriority>["tier"]) {
  if (tier === "critical") {
    return {
      shell: "border-rose-200 bg-rose-50/90",
      badge: "bg-rose-100 text-rose-800",
    };
  }
  if (tier === "high") {
    return {
      shell: "border-amber-200 bg-amber-50/90",
      badge: "bg-amber-100 text-amber-800",
    };
  }
  if (tier === "growth") {
    return {
      shell: "border-emerald-200 bg-emerald-50/90",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }
  return {
    shell: "border-slate-200 bg-slate-50/90",
    badge: "bg-slate-200 text-slate-700",
  };
}

export function PharmHumanPriorityCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildPharmHumanPriorityQueueSummary(orders);
  if (!summary) return null;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Human Priority
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
        {summary.candidates.map((candidate) => (
          <div
            key={candidate.orderId}
            className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                주문 #{candidate.orderId}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                {candidate.tierLabel}
              </span>
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">
              {candidate.headline}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {candidate.nextAction}
            </p>
            {candidate.products ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                관련 구성: {candidate.products}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PharmHumanPriorityStrip({
  order,
  messages,
}: {
  order: OrderAccordionOrder;
  messages?: OrderMessage[];
}) {
  const priority = buildPharmHumanPriority({ order, messages });
  if (priority.tier === "normal") return null;

  const style = getTierStyle(priority.tier);

  return (
    <div
      className={joinClassNames(
        "mt-3 rounded-2xl border px-4 py-3",
        style.shell
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            style.badge
          )}
        >
          {priority.tierLabel}
        </span>
        <span className="text-sm font-bold text-slate-900">{priority.headline}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{priority.summary}</p>
      <p className="mt-2 text-xs leading-5 font-medium text-slate-700">
        지금 액션: {priority.nextAction}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {priority.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
