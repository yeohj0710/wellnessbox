"use client";

import ComebackJourneyCard from "@/components/common/ComebackJourneyCard";
import { useComebackJourney } from "@/components/common/useComebackJourney";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import type { HomeCategory } from "./homeProductSection.types";

type HomeProductSectionComebackJourneyEntryProps = {
  categories: HomeCategory[];
  selectedCategories: number[];
  selectedPackage: string;
  onApplyRecommendedTrial: (categoryIds: number[]) => void;
};

export default function HomeProductSectionComebackJourneyEntry({
  categories,
  selectedCategories,
  selectedPackage,
  onApplyRecommendedTrial,
}: HomeProductSectionComebackJourneyEntryProps) {
  const { action, loading } = useComebackJourney({
    surface: "home-products",
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name || "",
    })),
  });

  if (loading || !action) return null;
  if (selectedCategories.length > 0) return null;
  if (selectedPackage !== HOME_PACKAGE_LABELS.all) return null;

  const handlePrimaryAction = () => {
    onApplyRecommendedTrial(action.matchedCategoryIds);
  };

  return (
    <ComebackJourneyCard
      action={action}
      onPrimaryAction={
        action.actionKind === "apply_trial_filters" ? handlePrimaryAction : null
      }
    />
  );
}
