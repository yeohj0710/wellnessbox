"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLoading } from "@/components/common/loadingContext.client";
import { navigateWithFallback } from "@/lib/client/navigation-fallback";
import HomeAdaptiveEntryStack from "./HomeAdaptiveEntryStack";
import HomeSupportAccordion from "./HomeSupportAccordion.client";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import type { HomeCategory } from "./homeProductSection.types";

type HomeAdaptiveSupportSectionProps = {
  categories: HomeCategory[];
};

function buildHomeProductsHref(categoryIds: number[], packageCode?: "7" | "30") {
  const params = new URLSearchParams();
  if (categoryIds.length > 0) {
    params.set("categories", categoryIds.join(","));
  }
  if (packageCode) {
    params.set("package", packageCode);
  }

  const query = params.toString();
  return query ? `/?${query}#home-products` : "/#home-products";
}

export default function HomeAdaptiveSupportSection({
  categories,
}: HomeAdaptiveSupportSectionProps) {
  const router = useRouter();
  const { showLoading } = useLoading();

  const navigateToFilters = useCallback(
    (categoryIds: number[], packageCode?: "7" | "30") => {
      showLoading();
      navigateWithFallback(router, buildHomeProductsHref(categoryIds, packageCode));
    },
    [router, showLoading]
  );

  if (categories.length === 0) return null;

  return (
    <HomeSupportAccordion
      eyebrow="GUIDE"
      title="처음 둘러보실 때 참고하실 내용이에요"
      description="입문용 추천이나 추가 안내가 필요하실 때만 가볍게 펼쳐보시면 됩니다."
    >
      <HomeAdaptiveEntryStack
        categories={categories}
        selectedCategories={[]}
        selectedPackage={HOME_PACKAGE_LABELS.all}
        onApplyRecommendedCategories={(categoryIds) =>
          navigateToFilters(categoryIds)
        }
        onApplyRecommendedTrial={(categoryIds) =>
          navigateToFilters(categoryIds, "7")
        }
        showNaturalLanguageRouter
        homeOffer={null}
        onHomeOfferAction={() => {}}
      />
    </HomeSupportAccordion>
  );
}
