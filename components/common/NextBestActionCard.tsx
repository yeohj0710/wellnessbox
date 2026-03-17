"use client";

import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { NextBestAction } from "@/lib/next-best-action/engine";

type NextBestActionCardProps = {
  action: NextBestAction | null;
  className?: string;
  onPrimaryAction?: (() => void) | null;
  hidePrimaryButton?: boolean;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(intensity: NextBestAction["intensity"]) {
  if (intensity === "strong") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_14px_34px_-24px_rgba(217,119,6,0.45)]",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 hover:bg-amber-600 text-white",
      dot: "bg-amber-400",
    };
  }

  if (intensity === "medium") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.35)]",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
      dot: "bg-sky-400",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 hover:bg-slate-950 text-white",
    dot: "bg-slate-400",
  };
}

export default function NextBestActionCard({
  action,
  className,
  onPrimaryAction,
  hidePrimaryButton = false,
  hideBehindBeta = true,
}: NextBestActionCardProps) {
  if (!action) return null;

  const tone = resolveTone(action.intensity);
  const badgeLabel =
    action.intensity === "strong"
      ? "지금 가장 먼저"
      : action.intensity === "medium"
      ? "다음으로 추천"
      : "가볍게 점검";

  const content = (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-4 sm:p-5",
        tone.shell,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={joinClassNames(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                tone.badge
              )}
            >
              {badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Next Best Action
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            {action.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {action.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{action.helper}</p>
        </div>
      </div>

      {action.reasonLines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {action.reasonLines.slice(0, 2).map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
            >
              <span
                className={joinClassNames(
                  "mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full",
                  tone.dot
                )}
              />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!hidePrimaryButton ? (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className={joinClassNames(
                "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
                tone.primary
              )}
            >
              {action.ctaLabel}
            </Link>
          ) : onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className={joinClassNames(
                "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
                tone.primary
              )}
            >
              {action.ctaLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return (
    <BetaFeatureGate title="Beta 다음 행동 추천">
      {content}
    </BetaFeatureGate>
  );
}
