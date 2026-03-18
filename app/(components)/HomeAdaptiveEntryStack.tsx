"use client";

import LandingPersonalizationCard from "@/components/common/LandingPersonalizationCard";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import { useLandingPersonalization } from "@/components/common/useLandingPersonalization";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
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
};

export default function HomeAdaptiveEntryStack({
  categories,
  selectedCategories,
  selectedPackage,
  onApplyRecommendedCategories,
  onApplyRecommendedTrial,
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

  return <div className="space-y-3">{order.map((key) => sections[key])}</div>;
}
