"use client";

import type { OrderCompleteNotificationPlan } from "@/lib/message-orchestration/engine";

function resolveTone(tone: OrderCompleteNotificationPlan["tone"]) {
  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.35)]",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 text-white hover:bg-sky-600",
      dot: "bg-sky-400",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 text-white hover:bg-slate-950",
    dot: "bg-slate-400",
  };
}

export default function OrderCompleteNotificationPlanCard({
  plan,
  onPrimaryAction,
  disabled = false,
}: {
  plan: OrderCompleteNotificationPlan;
  onPrimaryAction?: (() => void) | null;
  disabled?: boolean;
}) {
  const tone = resolveTone(plan.tone);

  return (
    <section className={`mt-4 rounded-[1.75rem] border p-4 sm:p-5 ${tone.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
            >
              알림 강도 조절
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Notification Orchestration
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            {plan.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {plan.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{plan.helper}</p>
        </div>
      </div>

      {plan.reasonLines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {plan.reasonLines.slice(0, 2).map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
            >
              <span
                className={`mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
              />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.mutedLines.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
          <div className="text-[11px] font-semibold text-slate-500">
            이번 주문에서 줄인 요청
          </div>
          <ul className="mt-2 space-y-2">
            {plan.mutedLines.slice(0, 2).map((line) => (
              <li
                key={line}
                className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
              >
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.ctaLabel && onPrimaryAction ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={disabled}
            onClick={onPrimaryAction}
            className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.primary}`}
          >
            {plan.ctaLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
