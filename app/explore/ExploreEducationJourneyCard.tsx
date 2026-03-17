"use client";

import { useMemo } from "react";
import type { ColumnSummary } from "@/app/column/_lib/columns-types";
import PersonalizedEducationCard from "@/components/common/PersonalizedEducationCard";
import { useAiExperiment } from "@/components/common/useAiExperiment";
import { recommendPersonalizedEducation } from "@/lib/education-content/engine";
import type { UserContextSummary } from "@/lib/chat/context.types";

type ExploreEducationJourneyCardProps = {
  columns: ColumnSummary[];
  summary: UserContextSummary;
};

function applyVariantCopy(input: {
  variantKey: string;
  eyebrow: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}) {
  if (input.variantKey === "action") {
    return {
      eyebrow: "바로 도움되는 읽을거리",
      primaryActionLabel: "읽고 바로 다음 행동 정하기",
      secondaryActionLabel: "상품 또는 상담으로 이어가기",
    };
  }

  return input;
}

export default function ExploreEducationJourneyCard({
  columns,
  summary,
}: ExploreEducationJourneyCardProps) {
  const insight = recommendPersonalizedEducation({
    columns,
    summary,
    surface: "explore",
  });

  const experiment = useAiExperiment({
    experimentKey: "explore_education_entry_v1",
    surface: "explore",
    route: "/explore",
    initialVariantKey: "guide",
    payload: {
      evidenceCount: summary.evidenceLabels.length,
      recommendedNutrients: summary.recommendedNutrients.slice(0, 3),
      safetyLevel: summary.safetyEscalation.level,
    },
    enabled: !!insight,
  });

  const copy = useMemo(
    () =>
      applyVariantCopy({
        variantKey: experiment.variantKey,
        eyebrow: "탐색 전 읽을거리",
        primaryActionLabel: "이 글 먼저 읽기",
        secondaryActionLabel: insight?.secondaryAction?.label,
      }),
    [experiment.variantKey, insight?.secondaryAction?.label]
  );

  if (!insight) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-[640px] px-3 sm:px-4">
      <PersonalizedEducationCard
        insight={insight}
        eyebrow={copy.eyebrow}
        primaryActionLabel={copy.primaryActionLabel}
        secondaryActionLabel={copy.secondaryActionLabel}
        onPrimaryAction={() => {
          experiment.track("primary_cta_click", {
            href: insight.primaryAction.href,
          });
        }}
        onSecondaryAction={() => {
          experiment.track("secondary_cta_click", {
            href: insight.secondaryAction?.href ?? null,
          });
        }}
        onOpenItem={({ slug, position }) => {
          experiment.track("article_click", {
            slug,
            position,
          });
        }}
      />
    </div>
  );
}
