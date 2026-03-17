"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { PurchaseRetentionModel } from "@/lib/order/purchase-retention";

type PurchaseRetentionCardProps = {
  model: PurchaseRetentionModel;
  primaryActionLabel?: string | null;
  onPrimaryAction?: (() => void) | null;
  secondaryActionLabel?: string | null;
  onSecondaryAction?: (() => void) | null;
  className?: string;
  hideBehindBeta?: boolean;
};

const toneClasses = {
  sky: {
    card: "border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]",
    badge: "bg-sky-100 text-sky-700",
    primary: "bg-sky-500 text-white hover:bg-sky-600",
    secondary: "bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  amber: {
    card: "border-amber-200 bg-[linear-gradient(180deg,#fffaf1_0%,#ffffff_100%)]",
    badge: "bg-amber-100 text-amber-700",
    primary: "bg-amber-500 text-white hover:bg-amber-600",
    secondary: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  emerald: {
    card: "border-emerald-200 bg-[linear-gradient(180deg,#f3fcf6_0%,#ffffff_100%)]",
    badge: "bg-emerald-100 text-emerald-700",
    primary: "bg-emerald-500 text-white hover:bg-emerald-600",
    secondary: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
} as const;

export default function PurchaseRetentionCard({
  model,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  hideBehindBeta = true,
}: PurchaseRetentionCardProps) {
  const tone = toneClasses[model.tone];

  const content = (
    <section className={`rounded-3xl border p-4 shadow-sm ${tone.card} ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.02em] ${tone.badge}`}
        >
          {model.badge}
        </span>
        <strong className="text-sm font-bold text-slate-900">{model.title}</strong>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-700">{model.body}</p>

      <ul className="mt-3 grid gap-2 pl-5 text-sm leading-6 text-slate-600">
        {model.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {primaryActionLabel || secondaryActionLabel ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {primaryActionLabel && onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${tone.primary}`}
            >
              {primaryActionLabel}
            </button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${tone.secondary}`}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 안심 가이드">{content}</BetaFeatureGate>;
}
