import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { PersonalizedEducationInsight } from "@/lib/education-content/engine";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: PersonalizedEducationInsight["tone"]) {
  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
    };
  }

  if (tone === "amber") {
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

type PersonalizedEducationCardProps = {
  insight: PersonalizedEducationInsight;
  eyebrow?: string;
  className?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onOpenItem?: (input: {
    slug: string;
    position: "primary" | "secondary";
  }) => void;
  hideBehindBeta?: boolean;
};

export default function PersonalizedEducationCard({
  insight,
  eyebrow = "맞춤 읽을거리",
  className,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onOpenItem,
  hideBehindBeta = true,
}: PersonalizedEducationCardProps) {
  const tone = resolveTone(insight.tone);

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
          {insight.badgeLabel}
        </span>
        <span className="text-[11px] font-medium text-slate-500">{eyebrow}</span>
      </div>

      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {insight.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{insight.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{insight.helper}</p>

      <div className="mt-4 rounded-[1.25rem] bg-white/90 px-4 py-3 ring-1 ring-white/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {insight.situationContext.badgeLabel}
          </span>
          {insight.situationContext.chips.length > 0 ? (
            <span className="text-[11px] text-slate-500">
              {insight.situationContext.chips.join(" / ")}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
          {insight.situationContext.headline}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {insight.situationContext.helper}
        </p>
      </div>

      {insight.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {insight.reasonLines.map((reason) => (
            <p key={reason} className="text-xs leading-5 text-slate-600">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {insight.chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.4rem] bg-white/90 p-4 ring-1 ring-white/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {insight.primaryItem.whyLabel}
          </span>
          <span className="text-xs text-slate-500">
            약 {insight.primaryItem.readingMinutes}분
          </span>
        </div>
        <Link
          href={`/column/${insight.primaryItem.slug}`}
          onClick={() =>
            onOpenItem?.({
              slug: insight.primaryItem.slug,
              position: "primary",
            })
          }
          className="mt-3 block text-base font-extrabold leading-6 text-slate-900 transition hover:text-sky-700"
        >
          {insight.primaryItem.title}
        </Link>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {insight.primaryItem.summary}
        </p>
        {insight.primaryItem.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.primaryItem.tags.map((tag) => (
              <span
                key={`${insight.primaryItem.slug}-${tag}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {insight.secondaryItems.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {insight.secondaryItems.map((item) => (
            <Link
              key={item.slug}
              href={`/column/${item.slug}`}
              onClick={() =>
                onOpenItem?.({
                  slug: item.slug,
                  position: "secondary",
                })
              }
              className="rounded-[1.25rem] bg-white/85 p-4 ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {item.whyLabel}
                </span>
                <span className="text-xs text-slate-500">약 {item.readingMinutes}분</span>
              </div>
              <div className="mt-2 text-sm font-bold leading-6 text-slate-900">
                {item.title}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.summary}</p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={insight.primaryAction.href}
          onClick={onPrimaryAction}
          className={joinClassNames(
            "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
            tone.primary
          )}
        >
          {primaryActionLabel ?? insight.primaryAction.label}
        </Link>
        {insight.secondaryAction ? (
          <Link
            href={insight.secondaryAction.href}
            onClick={onSecondaryAction}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {secondaryActionLabel ?? insight.secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 맞춤 읽을거리">{content}</BetaFeatureGate>;
}
