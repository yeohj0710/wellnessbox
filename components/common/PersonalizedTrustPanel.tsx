"use client";

import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import type { UserContextSummary } from "@/lib/chat/context";

type PersonalizedTrustPanelProps = {
  summary: UserContextSummary | null | undefined;
  className?: string;
  compact?: boolean;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveSafetyStyles(level: UserContextSummary["safetyEscalation"]["level"]) {
  if (level === "escalate") {
    return {
      tone: "border-rose-200 bg-rose-50/90",
      badge: "bg-rose-100 text-rose-700 ring-rose-200",
    };
  }

  if (level === "watch") {
    return {
      tone: "border-amber-200 bg-amber-50/90",
      badge: "bg-amber-100 text-amber-700 ring-amber-200",
    };
  }

  return {
    tone: "border-emerald-200 bg-emerald-50/90",
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
}

export default function PersonalizedTrustPanel({
  summary,
  className,
  compact = false,
  hideBehindBeta = true,
}: PersonalizedTrustPanelProps) {
  if (!summary) return null;

  const explainability = summary.explainability;
  const dataAsset = summary.dataAsset;
  const safetyEscalation = summary.safetyEscalation;
  const sectionTextSize = compact ? "text-[11px]" : "text-xs sm:text-sm";
  const titleTextSize = compact ? "text-[11px]" : "text-xs sm:text-sm";
  const cardPadding = compact ? "p-3" : "p-4 sm:p-5";
  const safetyStyles = resolveSafetyStyles(safetyEscalation.level);

  const content = (
    <section
      className={joinClassNames(
        "rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm",
        cardPadding,
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
              {explainability.confidenceLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              같이 보면 덜 헷갈리는 포인트
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {explainability.confidenceNote}
          </p>
        </div>
      </div>

      <div className={joinClassNames("mt-4 space-y-3", compact && "mt-3 space-y-2.5")}>
        {(dataAsset.reasonLines.length > 0 ||
          dataAsset.repeatedThemes.length > 0 ||
          dataAsset.adoptedThemes.length > 0) ? (
          <TrustSection
            title={`기록을 같이 보면 이런 점이 보여요 · ${dataAsset.strengthLabel}`}
            items={[
              dataAsset.summary,
              ...dataAsset.reasonLines,
              dataAsset.adoptedThemes.length > 0
                ? `이미 선택으로 이어진 내용: ${dataAsset.adoptedThemes.join(", ")}`
                : "",
              dataAsset.opportunityThemes.length > 0
                ? `여러 번 보인 내용: ${dataAsset.opportunityThemes.join(", ")}`
                : "",
            ].filter(Boolean)}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
            className="bg-sky-50/80 ring-sky-100"
          />
        ) : null}

        {(safetyEscalation.reasonLines.length > 0 ||
          safetyEscalation.needsMoreInfo.length > 0 ||
          safetyEscalation.level !== "routine") ? (
          <div
            className={joinClassNames(
              "rounded-xl px-3 py-3 ring-1",
              safetyStyles.tone
            )}
          >
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={joinClassNames(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                  safetyStyles.badge
                )}
              >
                {safetyEscalation.badgeLabel}
              </span>
              <p className="flex-1 text-xs leading-5 text-slate-700 sm:text-sm">
                {safetyEscalation.headline}
              </p>
            </div>

            {safetyEscalation.reasonLines.length > 0 ? (
              <TrustSection
                title="먼저 확인할 점"
                items={safetyEscalation.reasonLines}
                titleClassName={titleTextSize}
                itemClassName={sectionTextSize}
                className="mt-3 bg-white/70 ring-slate-200/70"
              />
            ) : null}

            {safetyEscalation.needsMoreInfo.length > 0 ? (
              <TrustSection
                title="같이 적어주면 좋은 정보"
                items={safetyEscalation.needsMoreInfo}
                titleClassName={titleTextSize}
                itemClassName={sectionTextSize}
                className="mt-3 bg-white/70 ring-slate-200/70"
              />
            ) : null}
          </div>
        ) : null}

        {explainability.fitReasons.length > 0 ? (
          <TrustSection
            title="왜 이렇게 보였는지"
            items={explainability.fitReasons}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
          />
        ) : null}

        {explainability.uncertaintyNotes.length > 0 ? (
          <TrustSection
            title="아직 더 확인이 필요한 점"
            items={explainability.uncertaintyNotes}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
          />
        ) : null}

        {explainability.pharmacistReviewPoints.length > 0 ? (
          <TrustSection
            title="같이 보면 좋은 점"
            items={explainability.pharmacistReviewPoints}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
          />
        ) : null}
      </div>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return (
    <BetaFeatureGate
      title="Beta 해석 근거"
      helper="지금 필요한 근거만 골라 확인해보세요."
      contentViewportClassName={
        compact ? "max-h-[min(46vh,26rem)] overflow-y-auto pr-1" : undefined
      }
    >
      {content}
    </BetaFeatureGate>
  );
}

function TrustSection({
  title,
  items,
  titleClassName,
  itemClassName,
  className,
}: {
  title: string;
  items: string[];
  titleClassName: string;
  itemClassName: string;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames(
        "rounded-xl bg-slate-50/90 px-3 py-3 ring-1 ring-slate-200/70",
        className
      )}
    >
      <p className={joinClassNames("font-semibold text-slate-800", titleClassName)}>
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={`${title}-${item}`}
            className={joinClassNames(
              "flex gap-2 leading-5 text-slate-600",
              itemClassName
            )}
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
