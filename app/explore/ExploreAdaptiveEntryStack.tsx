"use client";

import type { ColumnSummary } from "@/app/column/_lib/columns-types";
import LandingPersonalizationCard from "@/components/common/LandingPersonalizationCard";
import NaturalLanguageRoutingCard from "@/components/common/NaturalLanguageRoutingCard";
import PersonalizedValuePropositionCard from "@/components/common/PersonalizedValuePropositionCard";
import { useLandingPersonalization } from "@/components/common/useLandingPersonalization";
import { resolvePersonalizedValueProposition } from "@/lib/value-proposition/engine";
import ExploreComebackJourneyCard from "./ExploreComebackJourneyCard";
import ExploreEducationJourneyCard from "./ExploreEducationJourneyCard";
import ExploreNextBestActionCard from "./ExploreNextBestActionCard";

type ExploreAdaptiveEntryStackProps = {
  categories: Array<{ id: number; name: string }>;
  columns: ColumnSummary[];
};

function buildExploreHref(
  categoryIds: number[],
  preferredPackage: "all" | "7" | "30"
) {
  const query = new URLSearchParams();
  if (categoryIds.length > 0) {
    query.set("categories", categoryIds.join(","));
  }
  if (preferredPackage !== "all") {
    query.set("package", preferredPackage);
  }
  const queryText = query.toString();
  return queryText ? `/explore?${queryText}#home-products` : "/explore#home-products";
}

export default function ExploreAdaptiveEntryStack({
  categories,
  columns,
}: ExploreAdaptiveEntryStackProps) {
  const { focus, loading, summary } = useLandingPersonalization(categories);

  if (loading) return null;

  const href = buildExploreHref(
    focus.matchedCategoryIds,
    focus.preferredPackage
  );
  const valueProposition = resolvePersonalizedValueProposition({
    summary,
    surface: "explore",
    matchedCategoryNames: focus.matchedCategoryNames,
    preferredPackage: focus.preferredPackage,
  });

  const runValueAction = (
    target: "chat" | "explore" | "trial" | "check-ai" | "assess" | "my-data"
  ) => {
    switch (target) {
      case "chat":
        window.location.href = `/chat?from=/explore&draft=${encodeURIComponent(
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
        window.location.href = buildExploreHref(focus.matchedCategoryIds, "7");
        return;
      case "explore":
      default:
        window.location.href = href;
    }
  };

  const focusSection = (
    <div key="focus" className="mx-auto mt-6 w-full max-w-[640px] px-3 sm:px-4">
      <LandingPersonalizationCard
        focus={focus}
        primaryLabel="이 순서대로 둘러보기"
        secondaryLabel={
          focus.preferredPackage === "7"
            ? "7일치부터 보기"
            : "상품 섹션으로 이동"
        }
        onApplyPrimary={() => {
          window.location.href = href;
        }}
        onApplySecondary={() => {
          window.location.href =
            focus.preferredPackage === "7"
              ? buildExploreHref(focus.matchedCategoryIds, "7")
              : "/explore#home-products";
        }}
      />
    </div>
  );

  const segmentSection = (
    <div key="segment" className="mx-auto mt-6 w-full max-w-[640px] px-3 sm:px-4">
      <PersonalizedValuePropositionCard
        model={valueProposition}
        onPrimaryAction={() => runValueAction(valueProposition.primaryAction.target)}
        onSecondaryAction={
          valueProposition.secondaryAction
            ? () => runValueAction(valueProposition.secondaryAction!.target)
            : undefined
        }
      />
    </div>
  );

  const sections = {
    router: (
      <NaturalLanguageRoutingCard
        key="router"
        surface="explore"
        categories={categories}
        className="mt-6"
      />
    ),
    segment: segmentSection,
    focus: focusSection,
    education: (
      <ExploreEducationJourneyCard
        key="education"
        columns={columns}
        summary={summary}
      />
    ),
    comeback: <ExploreComebackJourneyCard key="comeback" categories={categories} />,
    nextBest: <ExploreNextBestActionCard key="next-best" categories={categories} />,
  } as const;

  type SectionKey = keyof typeof sections;

  const order: SectionKey[] = summary.journeySegment.exploreOrder;

  return <>{order.map((key) => sections[key])}</>;
}
