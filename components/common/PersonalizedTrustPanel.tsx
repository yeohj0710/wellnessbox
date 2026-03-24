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

function filterVisibleItems(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.replace(/\s+/g, " ");
      return !(
        normalized.includes("정보가 없") ||
        normalized.includes("기록이 없") ||
        normalized.includes("검사 기록이 없") ||
        normalized.includes("건강링크 정보가 없") ||
        normalized.includes("아직은 기록이 많지 않아요") ||
        normalized.includes("아직 기록이 많지 않아요") ||
        normalized.includes("충분히 반영되지")
      );
    });
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
  const sectionTextSize = compact
    ? "text-[13px] leading-6 sm:text-sm"
    : "text-xs sm:text-sm";
  const titleTextSize = compact ? "text-[13px] sm:text-sm" : "text-xs sm:text-sm";
  const cardPadding = compact ? "p-4" : "p-4 sm:p-5";
  const safetyStyles = resolveSafetyStyles(safetyEscalation.level);

  const visibleDataAssetItems = filterVisibleItems(
    [
      dataAsset.summary,
      ...dataAsset.reasonLines,
      dataAsset.adoptedThemes.length > 0
        ? `실제 선택까지 이어진 내용: ${dataAsset.adoptedThemes.join(", ")}`
        : "",
      dataAsset.opportunityThemes.length > 0
        ? `여러 번 함께 보인 내용: ${dataAsset.opportunityThemes.join(", ")}`
        : "",
    ].filter(Boolean)
  );
  const visibleSafetyReasonLines = filterVisibleItems(safetyEscalation.reasonLines);
  const visibleNeedsMoreInfo = filterVisibleItems(safetyEscalation.needsMoreInfo);
  const visibleFitReasons = filterVisibleItems(explainability.fitReasons);
  const visibleUncertaintyNotes = filterVisibleItems(explainability.uncertaintyNotes);
  const visibleReviewPoints = filterVisibleItems(
    explainability.pharmacistReviewPoints
  );

  const showDataAssetSection =
    dataAsset.stage !== "light" && visibleDataAssetItems.length > 0;
  const showSafetySection =
    visibleSafetyReasonLines.length > 0 || visibleNeedsMoreInfo.length > 0;

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
            <span className="rounded-full bg-sky-50 px-3 py-1 text-[12px] font-semibold text-sky-700 ring-1 ring-sky-100">
              {explainability.confidenceLabel}
            </span>
            <span className="text-[12px] font-medium text-slate-500 sm:text-[13px]">
              같이 보면 덜 헷갈리는 포인트
            </span>
          </div>
          {explainability.confidenceNote ? (
            <p
              className={joinClassNames(
                "mt-2 text-slate-700",
                compact ? "text-[14px] leading-6" : "text-sm leading-6"
              )}
            >
              {explainability.confidenceNote}
            </p>
          ) : null}
        </div>
      </div>

      <div className={joinClassNames("mt-4 space-y-3", compact && "mt-3 space-y-2.5")}>
        {showDataAssetSection ? (
          <TrustSection
            title={`몇 가지 기록을 함께 봤어요 · ${dataAsset.strengthLabel}`}
            items={visibleDataAssetItems}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
            className="bg-sky-50/80 ring-sky-100"
          />
        ) : null}

        {showSafetySection ? (
          <div
            className={joinClassNames(
              "rounded-xl px-3 py-3 ring-1",
              safetyStyles.tone
            )}
          >
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={joinClassNames(
                  "rounded-full px-3 py-1 text-[12px] font-semibold ring-1",
                  safetyStyles.badge
                )}
              >
                {safetyEscalation.badgeLabel}
              </span>
              <p className="flex-1 text-sm leading-6 text-slate-700">
                {safetyEscalation.headline}
              </p>
            </div>

            {visibleSafetyReasonLines.length > 0 ? (
              <TrustSection
                title="먼저 확인할 점"
                items={visibleSafetyReasonLines}
                titleClassName={titleTextSize}
                itemClassName={sectionTextSize}
                className="mt-3 bg-white/70 ring-slate-200/70"
              />
            ) : null}

            {visibleNeedsMoreInfo.length > 0 ? (
              <TrustSection
                title="같이 적어주면 좋은 정보"
                items={visibleNeedsMoreInfo}
                titleClassName={titleTextSize}
                itemClassName={sectionTextSize}
                className="mt-3 bg-white/70 ring-slate-200/70"
              />
            ) : null}
          </div>
        ) : null}

        {visibleFitReasons.length > 0 ? (
          <TrustSection
            title="왜 이렇게 보였는지"
            items={visibleFitReasons}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
          />
        ) : null}

        {visibleUncertaintyNotes.length > 0 ? (
          <TrustSection
            title="조금 더 보면 좋은 부분"
            items={visibleUncertaintyNotes}
            titleClassName={titleTextSize}
            itemClassName={sectionTextSize}
          />
        ) : null}

        {visibleReviewPoints.length > 0 ? (
          <TrustSection
            title="함께 보면 좋은 점"
            items={visibleReviewPoints}
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
      helper="지금 필요한 근거만 골라서 편하게 확인해보세요."
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
      <ul className="mt-2.5 space-y-2">
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
