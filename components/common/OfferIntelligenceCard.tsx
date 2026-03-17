"use client";

import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type {
  OfferAction,
  OfferCardModel,
} from "@/lib/offer-intelligence/engine";

type OfferIntelligenceCardProps = {
  offer: OfferCardModel | null;
  className?: string;
  onAction?: ((action: OfferAction) => void) | null;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(segment: OfferCardModel["segment"]) {
  if (segment === "returning") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-[0_14px_34px_-24px_rgba(16,185,129,0.4)]",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    };
  }

  if (segment === "confidence") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.35)]",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
    };
  }

  if (segment === "review") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_14px_34px_-24px_rgba(217,119,6,0.35)]",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 hover:bg-slate-950 text-white",
  };
}

function renderAction(
  action: OfferAction,
  toneClassName: string,
  onAction?: ((action: OfferAction) => void) | null
) {
  if (action.type === "link") {
    return (
      <Link
        href={action.href}
        className={joinClassNames(
          "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
          toneClassName
        )}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      className={joinClassNames(
        "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
        toneClassName
      )}
    >
      {action.label}
    </button>
  );
}

export default function OfferIntelligenceCard({
  offer,
  className,
  onAction,
  hideBehindBeta = true,
}: OfferIntelligenceCardProps) {
  if (!offer) return null;

  const tone = resolveTone(offer.segment);

  const content = (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-4 sm:p-5",
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
          {offer.badgeLabel}
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          맞춤 오퍼
        </span>
      </div>

      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {offer.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{offer.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{offer.helper}</p>

      <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
        <div className="text-[11px] font-semibold text-slate-500">
          지금 이 사용자에게 먼저 먹히는 설득 포인트
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {offer.priceFrameLabel}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {offer.priceFrameHelper}
        </p>
      </div>

      {offer.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {offer.reasonLines.slice(0, 3).map((reason) => (
            <p key={reason} className="text-xs leading-5 text-slate-600">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {offer.chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {offer.primaryAction || offer.secondaryAction ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {offer.primaryAction
            ? renderAction(offer.primaryAction, tone.primary, onAction)
            : null}
          {offer.secondaryAction
            ? renderAction(
                offer.secondaryAction,
                "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
                onAction
              )
            : null}
        </div>
      ) : null}
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 맞춤 오퍼">{content}</BetaFeatureGate>;
}
