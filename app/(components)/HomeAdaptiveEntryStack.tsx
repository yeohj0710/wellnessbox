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

  const heroKey = order[0];
  const heroCard = sections[heroKey];
  const secondaryCards = order.slice(1).map((key) => sections[key]);
  const labCount =
    secondaryCards.length + (showNaturalLanguageRouter ? 1 : 0) + (homeOffer ? 1 : 0);

  return (
    <div className="space-y-3">
      {heroCard}

      {labCount > 0 ? (
        <details className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  Labs
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  보조 탐색 흐름 {labCount}개
                </span>
              </div>
              <p className="mt-2 text-base font-bold tracking-tight text-slate-900">
                더 많은 실험 기능은 한곳에서 가볍게 펼쳐보세요
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                길찾기, 복귀 제안, 개인화 진입, 맞춤 오퍼를 따로 흩어두지 않고 한
                묶음으로 정리했습니다.
              </p>
            </div>
            <div className="mt-1 shrink-0 text-xs font-semibold text-slate-400">
              <span className="group-open:hidden">열기</span>
              <span className="hidden group-open:inline">접기</span>
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

              {secondaryCards}

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
