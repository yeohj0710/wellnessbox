import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import {
  buildRiderOpsQueueSummary,
  buildRiderOrderCopilot,
} from "@/lib/ops/order-status-copilot";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveToneStyles(tone: "strong" | "medium" | "soft") {
  if (tone === "strong") {
    return {
      shell: "border-amber-200 bg-amber-50/90",
      badge: "bg-amber-100 text-amber-800",
      accent: "text-amber-700",
    };
  }

  if (tone === "medium") {
    return {
      shell: "border-sky-200 bg-sky-50/90",
      badge: "bg-sky-100 text-sky-800",
      accent: "text-sky-700",
    };
  }

  return {
    shell: "border-slate-200 bg-slate-50/90",
    badge: "bg-slate-200 text-slate-700",
    accent: "text-slate-700",
  };
}

export function RiderOpsQueueCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildRiderOpsQueueSummary(orders);
  if (!summary) return null;

  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        라이더 코파일럿
      </div>
      <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
        {summary.headline}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{summary.summary}</p>

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
    </div>
  );
}

export function RiderOrderCopilotStrip({
  order,
}: {
  order: OrderAccordionOrder;
}) {
  const copilot = buildRiderOrderCopilot(order);
  const toneStyles = resolveToneStyles(copilot.tone);

  return (
    <div
      className={joinClassNames(
        "mt-4 rounded-2xl border px-4 py-3",
        toneStyles.shell
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            toneStyles.badge
          )}
        >
          {copilot.badgeLabel}
        </span>
        <span className="text-sm font-bold text-slate-900">{copilot.title}</span>
      </div>

      <p className={joinClassNames("mt-2 text-sm leading-6", toneStyles.accent)}>
        {copilot.helper}
      </p>

      <div className="mt-3 space-y-1">
        {copilot.reasonLines.map((line) => (
          <p key={line} className="text-xs leading-5 text-slate-600">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
