"use client";

import { useMemo } from "react";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import { buildCustomerOrderProgressCoach } from "@/lib/order/customerOrderProgressCoach";
import type { OrderAccordionOrder, OrderMessage } from "./orderAccordion.types";

type CustomerOrderProgressCoachProps = {
  order: OrderAccordionOrder;
  messages: OrderMessage[];
  isSubscribed: boolean;
  actionLoading?: boolean;
  onOpenMessages: () => void;
  onToggleSubscription: () => void;
};

const toneClasses = {
  sky: {
    card: "border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]",
    badge: "bg-sky-100 text-sky-700",
    button: "bg-sky-500 text-white hover:bg-sky-600",
  },
  amber: {
    card: "border-amber-200 bg-[linear-gradient(180deg,#fff9f1_0%,#ffffff_100%)]",
    badge: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-white hover:bg-amber-600",
  },
  emerald: {
    card: "border-emerald-200 bg-[linear-gradient(180deg,#f3fcf6_0%,#ffffff_100%)]",
    badge: "bg-emerald-100 text-emerald-700",
    button: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  slate: {
    card: "border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]",
    badge: "bg-slate-100 text-slate-700",
    button: "bg-slate-700 text-white hover:bg-slate-800",
  },
} as const;

export default function CustomerOrderProgressCoach({
  order,
  messages,
  isSubscribed,
  actionLoading = false,
  onOpenMessages,
  onToggleSubscription,
}: CustomerOrderProgressCoachProps) {
  const coach = useMemo(
    () =>
      buildCustomerOrderProgressCoach({
        order,
        messages,
        isSubscribed,
      }),
    [isSubscribed, messages, order]
  );

  const tone = toneClasses[coach.tone];

  return (
    <section
      className={`mt-5 rounded-2xl border p-4 shadow-sm ${tone.card}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.02em] ${tone.badge}`}
        >
          {coach.badge}
        </span>
        <strong className="text-sm font-bold text-slate-900">{coach.title}</strong>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-700">{coach.summary}</p>

      <ul className="mt-3 grid gap-2 pl-5 text-sm leading-6 text-slate-600">
        {coach.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">{coach.helper}</p>

        {coach.primaryAction.kind !== "none" && coach.primaryAction.label ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={
              coach.primaryAction.kind === "message"
                ? onOpenMessages
                : onToggleSubscription
            }
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${tone.button} ${
              actionLoading ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {actionLoading ? (
              <InlineSpinnerLabel label="처리 중" />
            ) : (
              coach.primaryAction.label
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}
