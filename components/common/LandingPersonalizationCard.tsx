"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { LandingPersonalizationFocus } from "@/lib/landing-personalization/engine";

type LandingPersonalizationCardProps = {
  focus: LandingPersonalizationFocus;
  onApplyPrimary?: (() => void) | null;
  onApplySecondary?: (() => void) | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  className?: string;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(segment: LandingPersonalizationFocus["segment"]) {
  if (segment === "returning") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    };
  }

  if (segment === "results") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
    };
  }

  if (segment === "review") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 hover:bg-slate-950 text-white",
  };
}

export default function LandingPersonalizationCard({
  focus,
  onApplyPrimary,
  onApplySecondary,
  primaryLabel = "이 흐름 먼저 보기",
  secondaryLabel = "7일치부터 보기",
  className,
  hideBehindBeta = true,
}: LandingPersonalizationCardProps) {
  const tone = resolveTone(focus.segment);
  const badgeLabel =
    focus.segment === "returning"
      ? "복귀 우선"
      : focus.segment === "results"
      ? "결과 우선"
      : focus.segment === "review"
      ? "점검 우선"
      : "입문 우선";

  const content = (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-4 sm:p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell,
        className
      )}
    >
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
          랜딩 개인화
        </span>
      </div>

      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {focus.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{focus.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{focus.helper}</p>

      {focus.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {focus.reasonLines.map((reason) => (
            <p key={reason} className="text-xs leading-5 text-slate-600">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {focus.matchedCategoryNames.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {focus.matchedCategoryNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}

      {onApplyPrimary || onApplySecondary ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {onApplyPrimary ? (
            <button
              type="button"
              onClick={onApplyPrimary}
              className={joinClassNames(
                "rounded-2xl px-4 py-3 text-sm font-bold transition",
                tone.primary
              )}
            >
              {primaryLabel}
            </button>
          ) : null}
          {onApplySecondary ? (
            <button
              type="button"
              onClick={onApplySecondary}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 개인화 진입">{content}</BetaFeatureGate>;
}
