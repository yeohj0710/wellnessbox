"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { usePathname } from "next/navigation";
import SmoothAccordion from "@/components/common/SmoothAccordion.client";
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
  const pathname = usePathname();
  const [labsOpen, setLabsOpen] = useState(false);
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
            ? "지금 잘 맞는 구성부터 보기"
            : "입문용 구성부터 보기"
        }
        secondaryLabel={
          focus.preferredPackage === "7"
            ? "7일치부터 보기"
            : "가볍게 비교해보기"
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

  if (pathname?.startsWith("/explore")) return null;
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
        <SmoothAccordion
          open={labsOpen}
          onToggle={() => setLabsOpen((prev) => !prev)}
          className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/95 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)]"
          buttonClassName="items-center px-4 py-3 sm:px-5"
          panelClassName="border-t border-slate-200/80"
          panelInnerClassName="px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
          summary={
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  More
                </span>
                <span className="text-xs font-medium text-slate-500">
                  추가 안내 {labCount}개
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                필요하실 때만 더 살펴보세요
              </p>
            </div>
          }
          indicator={
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all duration-300">
              {labsOpen ? "접기" : "열기"}
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-300 ${
                  labsOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          }
        >
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
        </SmoothAccordion>
      ) : null}
    </div>
  );
}
