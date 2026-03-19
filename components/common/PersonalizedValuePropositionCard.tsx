"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { PersonalizedValueProposition } from "@/lib/value-proposition/engine";

type PersonalizedValuePropositionCardProps = {
  model: PersonalizedValueProposition;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(model: PersonalizedValueProposition) {
  switch (model.id) {
    case "safety":
      return {
        shell:
          "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
        badge: "bg-amber-100 text-amber-800",
        primary: "bg-amber-500 hover:bg-amber-600 text-white",
      };
    case "decision":
      return {
        shell:
          "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50",
        badge: "bg-indigo-100 text-indigo-800",
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
      };
    case "goal":
      return {
        shell:
          "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50",
        badge: "bg-sky-100 text-sky-800",
        primary: "bg-sky-600 hover:bg-sky-700 text-white",
      };
    case "restart":
      return {
        shell:
          "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-teal-50",
        badge: "bg-cyan-100 text-cyan-800",
        primary: "bg-cyan-600 hover:bg-cyan-700 text-white",
      };
    case "maintain":
      return {
        shell:
          "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
        badge: "bg-emerald-100 text-emerald-800",
        primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
    default:
      return {
        shell:
          "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
        badge: "bg-slate-200 text-slate-700",
        primary: "bg-slate-900 hover:bg-slate-950 text-white",
      };
  }
}

export default function PersonalizedValuePropositionCard({
  model,
  onPrimaryAction,
  onSecondaryAction,
  className,
  compact = false,
  hideBehindBeta = true,
}: PersonalizedValuePropositionCardProps) {
  const tone = resolveTone(model);

  const content = (
    <section
      className={joinClassNames(
        compact
          ? "rounded-2xl border p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)]"
          : "rounded-[1.75rem] border p-4 sm:p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[12px] font-semibold",
            tone.badge
          )}
        >
          {model.badgeLabel}
        </span>
        <span className="text-[12px] font-medium text-slate-500 sm:text-[13px]">
          지금 상황에 맞춘 제안
        </span>
      </div>

      <h2
        className={joinClassNames(
          compact
            ? "mt-2.5 text-[1.05rem] font-extrabold tracking-tight text-slate-900 sm:text-lg"
            : "mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
        )}
      >
        {model.headline}
      </h2>
      <p
        className={joinClassNames(
          compact
            ? "mt-2 text-[14px] leading-6 text-slate-700"
            : "mt-2 text-sm leading-6 text-slate-700"
        )}
      >
        {model.description}
      </p>
      <p
        className={joinClassNames(
          compact
            ? "mt-2 text-[13px] leading-5 text-slate-500"
            : "mt-2 text-xs leading-5 text-slate-500"
        )}
      >
        {model.helper}
      </p>

      <div
        className={joinClassNames(
          compact
            ? "mt-3 rounded-2xl bg-white/85 px-3 py-2.5 ring-1 ring-white/80"
            : "mt-4 rounded-[1.25rem] bg-white/90 px-4 py-3 ring-1 ring-white/80"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
            {model.situationContext.badgeLabel}
          </span>
          {model.situationContext.chips.length > 0 ? (
            <span className="text-[12px] text-slate-500">
              {model.situationContext.chips.join(" / ")}
            </span>
          ) : null}
        </div>
        <p
          className={joinClassNames(
            compact
              ? "mt-2 text-[14px] font-semibold leading-6 text-slate-800"
              : "mt-2 text-sm font-semibold leading-6 text-slate-800"
          )}
        >
          {model.situationContext.headline}
        </p>
        <p
          className={joinClassNames(
            compact
              ? "mt-1 text-[13px] leading-5 text-slate-500"
              : "mt-1 text-xs leading-5 text-slate-500"
          )}
        >
          {model.situationContext.helper}
        </p>
      </div>

      {model.reasonLines.length > 0 ? (
        <div className={compact ? "mt-3 space-y-1" : "mt-4 space-y-1.5"}>
          {model.reasonLines.map((reason) => (
            <p
              key={reason}
              className={joinClassNames(
                compact
                  ? "text-[13px] leading-6 text-slate-600"
                  : "text-xs leading-5 text-slate-600"
              )}
            >
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {onPrimaryAction || (model.secondaryAction && onSecondaryAction) ? (
        <div
          className={joinClassNames(
            compact ? "mt-3 grid gap-2.5" : "mt-4 grid gap-2 sm:grid-cols-2"
          )}
        >
          {onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className={joinClassNames(
                "min-h-12 rounded-2xl px-4 py-3 text-sm font-bold transition",
                tone.primary
              )}
            >
              {model.primaryAction.label}
            </button>
          ) : null}
          {model.secondaryAction && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="min-h-12 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              {model.secondaryAction.label}
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
    <BetaFeatureGate
      title="Beta 개인화 제안"
      helper="핵심만 짧게 보고 결정해도 괜찮아요."
      contentViewportClassName={
        compact ? "max-h-[min(46vh,26rem)] overflow-y-auto pr-1" : undefined
      }
    >
      {content}
    </BetaFeatureGate>
  );
}
