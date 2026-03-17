import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { buildPharmAnomalyRadarSummary } from "@/lib/pharm/anomaly-radar";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveToneStyle(tone: "critical" | "warn" | "watch") {
  if (tone === "critical") {
    return {
      shell: "bg-rose-50 ring-rose-100",
      badge: "bg-rose-100 text-rose-700",
      accent: "text-rose-700",
    };
  }

  if (tone === "warn") {
    return {
      shell: "bg-amber-50 ring-amber-100",
      badge: "bg-amber-100 text-amber-700",
      accent: "text-amber-700",
    };
  }

  return {
    shell: "bg-sky-50 ring-sky-100",
    badge: "bg-sky-100 text-sky-700",
    accent: "text-sky-700",
  };
}

export function PharmAnomalyRadarCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildPharmAnomalyRadarSummary(orders);
  if (!summary) return null;

  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-rose-50 via-white to-sky-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            이상징후 레이더
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

      <div className="mt-5 grid gap-3">
        {summary.alerts.map((alert) => {
          const toneStyle = resolveToneStyle(alert.tone);

          return (
            <div
              key={alert.id}
              className={joinClassNames(
                "rounded-2xl p-4 ring-1",
                toneStyle.shell
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={joinClassNames(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    toneStyle.badge
                  )}
                >
                  {alert.label}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {alert.headline}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">{alert.detail}</p>
              <p className={joinClassNames("mt-2 text-xs font-semibold", toneStyle.accent)}>
                지금 할 일: {alert.actionLabel}
              </p>

              <div className="mt-3 space-y-1.5">
                {alert.reasonLines.map((line) => (
                  <p key={line} className="text-xs leading-5 text-slate-600">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
