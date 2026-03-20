"use client";

import NaturalLanguageRoutingCard from "@/components/common/NaturalLanguageRoutingCard";
import OfferIntelligenceCard from "@/components/common/OfferIntelligenceCard";
import LandingPersonalizationCard from "@/components/common/LandingPersonalizationCard";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import { useLandingPersonalization } from "@/components/common/useLandingPersonalization";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
import type { OfferAction, OfferCardModel } from "@/lib/offer-intelligence/engine";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import HomeProductSectionComebackJourneyEntry from "./homeProductSectionComebackJourneyEntry";
import HomeProductSectionPersonalizedEntry from "./homeProductSectionPersonalizedEntry";
import type { HomeCategory } from "./homeProductSection.types";

type HomeAdaptiveEntryStackProps = {
  categories: HomeCategory[];
  selectedCategories: number[];
  selectedPackage: string;
  onApplyRecommendedCategories: (categoryIds: number[]) => void;
  onApplyRecommendedTrial: (categoryIds: number[]) => void;
  showNaturalLanguageRouter: boolean;
  homeOffer: OfferCardModel | null;
  onHomeOfferAction: (action: OfferAction) => void;
};

export default function HomeAdaptiveEntryStack({
  categories,
  selectedCategories,
  selectedPackage,
  onApplyRecommendedCategories,
  onApplyRecommendedTrial,
  showNaturalLanguageRouter,
  homeOffer,
  onHomeOfferAction,
}: HomeAdaptiveEntryStackProps) {
  const { focus, loading, summary } = useLandingPersonalization(categories);
  const valueProposition = resolvePersonalizedValueProposition({
    summary,
    surface: "home",
    matchedCategoryNames: focus.matchedCategoryNames,
    preferredPackage: focus.preferredPackage,
  });

  const runValueAction = (
    target: "chat" | "explore" | "trial" | "check-ai" | "assess" | "my-data"
  ) => {
    switch (target) {
      case "chat":
        window.location.href = `/chat?from=/&draft=${encodeURIComponent(
          valueProposition.chatPrompt
        )}`;
        return;
      case "my-data":
        window.location.href = "/my-data";
        return;
      case "check-ai":
        window.location.href = "/check-ai";
        return;
      case "assess":
        window.location.href = "/assess";
        return;
      case "trial":
        onApplyRecommendedTrial(focus.matchedCategoryIds);
        return;
      case "explore":
      default:
        if (focus.matchedCategoryIds.length > 0) {
          onApplyRecommendedCategories(focus.matchedCategoryIds);
          return;
        }
        onApplyRecommendedTrial([]);
    }
  };

  const sections = {
    segment: (
      <PersonalizedValuePropositionCard
        key="segment"
        model={valueProposition}
        hideBehindBeta={false}
        onPrimaryAction={() => runValueAction(valueProposition.primaryAction.target)}
        onSecondaryAction={
          valueProposition.secondaryAction
            ? () => runValueAction(valueProposition.secondaryAction!.target)
            : undefined
        }
      />
    ),
    focus: (
      <LandingPersonalizationCard
        key="focus"
        focus={focus}
        hideBehindBeta={false}
        onApplyPrimary={
          focus.matchedCategoryIds.length > 0
            ? () => onApplyRecommendedCategories(focus.matchedCategoryIds)
            : () => onApplyRecommendedTrial([])
        }
        onApplySecondary={() =>
          onApplyRecommendedTrial(focus.matchedCategoryIds)
        }
        primaryLabel={
          focus.matchedCategoryIds.length > 0
            ? "지금 맞는 추천만 보기"
            : "입문용 구성부터 보기"
        }
        secondaryLabel={
          focus.preferredPackage === "7"
            ? "7일치부터 보기"
            : "가볍게 비교하기"
        }
      />
    ),
    comeback: (
      <HomeProductSectionComebackJourneyEntry
        key="comeback"
        categories={categories}
        selectedCategories={selectedCategories}
        selectedPackage={selectedPackage}
        onApplyRecommendedTrial={onApplyRecommendedTrial}
        hideBehindBeta={false}
      />
    ),
    personalized: (
      <HomeProductSectionPersonalizedEntry
        key="personalized"
        categories={categories}
        selectedCategories={selectedCategories}
        selectedPackage={selectedPackage}
        onApplyRecommendedCategories={onApplyRecommendedCategories}
        onApplyRecommendedTrial={onApplyRecommendedTrial}
        hideBehindBeta={false}
      />
    ),
  } as const;

  type SectionKey = keyof typeof sections;

  if (loading || categories.length === 0) return null;

  const order: SectionKey[] =
    selectedCategories.length === 0 &&
    selectedPackage === HOME_PACKAGE_LABELS.all
      ? summary.journeySegment.homeOrder
      : ["segment", "focus", "personalized", "comeback"];

  const hiddenSectionKeys = order.filter((key) => key === "segment");
  const primarySectionKeys = order.filter((key) => key !== "segment");
  const heroKey = primarySectionKeys[0] ?? "focus";
  const heroCard = sections[heroKey];
  const hiddenCards = hiddenSectionKeys.map((key) => sections[key]);
  const secondaryCards = primarySectionKeys.slice(1).map((key) => sections[key]);
  const labCards = [...hiddenCards, ...secondaryCards];
  const labCount =
    labCards.length + (showNaturalLanguageRouter ? 1 : 0) + (homeOffer ? 1 : 0);

  return (
    <div className="space-y-3">
      {heroCard}

      {labCount > 0 ? (
        <details className="group overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/95 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  Labs
                </span>
                <span className="text-xs font-medium text-slate-500">
                  보조 탐색 {labCount}개
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                필요할 때만 보조 탐색을 펼쳐보세요
              </p>
            </div>
            <div className="shrink-0 text-xs font-semibold text-slate-400">
              <span className="group-open:hidden">열기</span>
              <span className="hidden group-open:inline">닫기</span>
            </div>
          </summary>

          <div className="border-t border-slate-200/80 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            <div className="space-y-3">
              {showNaturalLanguageRouter ? (
                <NaturalLanguageRoutingCard
                  surface="home"
                  hideBehindBeta={false}
                  categories={categories.map((category) => ({
                    id: category.id,
                    name: category.name || "",
                  }))}
                  className="!mx-0 !max-w-none !px-0"
                />
              ) : null}

              {labCards}

              {homeOffer ? (
                <OfferIntelligenceCard
                  offer={homeOffer}
                  onAction={onHomeOfferAction}
                  hideBehindBeta={false}
                />
              ) : null}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
