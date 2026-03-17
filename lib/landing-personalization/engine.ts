import {
  resolveMatchedCategoriesByLabels,
} from "@/lib/ai-capabilities/personalization";
import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";
import type { NormalizedAllResults } from "@/app/chat/hooks/useChat.results";

export type LandingCategory = {
  id: number;
  name: string;
};

export type LandingProduct = {
  id: number;
  name: string;
  categories?: Array<{ id?: number; name: string }>;
  pharmacyProducts?: Array<{
    optionType?: string | null;
    stock?: number | null;
    pharmacyId?: number | null;
    pharmacy?: { id?: number | null } | null;
  }>;
};

export type LandingPersonalizationSegment =
  | "starter"
  | "results"
  | "returning"
  | "review";

export type LandingPersonalizationFocus = {
  segment: LandingPersonalizationSegment;
  title: string;
  description: string;
  helper: string;
  matchedCategoryIds: number[];
  matchedCategoryNames: string[];
  preferredPackage: "all" | "7" | "30";
  sectionOrder: Array<"focus" | "comeback" | "personalized">;
  reasonLines: string[];
  previousProductNames: string[];
};

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function toDate(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function daysSince(value: string | number | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

export function resolveLandingPersonalizationFocus(input: {
  summary: UserContextSummary;
  remoteResults: NormalizedAllResults | null;
  categories: LandingCategory[];
}): LandingPersonalizationFocus {
  const matchedCategories = resolveMatchedCategoriesByLabels(
    input.summary.recommendedNutrients,
    input.categories
  );
  const signals = buildUserCapabilitySignals(input.summary);
  const matchedCategoryIds = matchedCategories.map((category) => category.id);
  const matchedCategoryNames = matchedCategories.map((category) => category.name);
  const lastOrderDays = daysSince(input.remoteResults?.orders[0]?.createdAt);
  const previousProductNames = uniqueStrings(
    (input.remoteResults?.orders[0]?.items || [])
      .map((item) => item.name)
      .filter(Boolean),
    3
  );

  if (
    signals.journeySegmentId === "drifting_returner" ||
    signals.journeySegmentId === "steady_maintainer"
  ) {
    return {
      segment: "returning",
      title: "예전에 보던 흐름부터 다시 이어보는 편이 지금 가장 자연스러워요",
      description:
        previousProductNames.length > 0
          ? `최근 주문의 ${previousProductNames.join(", ")} 흐름을 바탕으로 다시 보기 좋게 먼저 정리해 둘게요.`
          : "예전 선택을 무작정 반복하기보다 다시 붙기 쉬운 흐름부터 먼저 보여주는 편이 좋아요.",
      helper:
        lastOrderDays != null && lastOrderDays >= 30
          ? "복귀 시점이 길어졌다면 같은 강도 반복보다 7일치 재시작이 더 잘 맞을 수 있어요."
          : "최근에 하던 흐름을 먼저 복원하면 다시 결정하기가 훨씬 쉬워져요.",
      matchedCategoryIds,
      matchedCategoryNames,
      preferredPackage: lastOrderDays != null && lastOrderDays >= 30 ? "7" : "all",
      sectionOrder: ["comeback", "focus", "personalized"],
      reasonLines: uniqueStrings(
        [
          previousProductNames.length > 0
            ? `최근 주문 맥락: ${previousProductNames.join(", ")}`
            : "",
          lastOrderDays != null ? `마지막 주문 후 ${lastOrderDays}일 경과` : "",
          matchedCategoryNames.length > 0
            ? `최근 데이터 추천 축: ${matchedCategoryNames.join(", ")}`
            : "",
        ].filter(Boolean),
        3
      ),
      previousProductNames,
    };
  }

  if (
    signals.journeySegmentId === "goal_driven_builder" &&
    matchedCategoryIds.length > 0
  ) {
    return {
      segment: "results",
      title: "지금은 최근 결과와 목표에 맞는 축부터 보는 편이 좋아요",
      description: `${matchedCategoryNames.join(", ")} 기준으로 먼저 정렬해 둘게요. 같은 목록이어도 무엇부터 보게 할지 순서를 바꿔드립니다.`,
      helper:
        signals.orderCount === 0
          ? "첫 구매라면 7일치부터 시작해도 좋고, 바로 비교하고 싶다면 맞는 성분만 먼저 보세요."
          : "최근 결과와 주문 맥락이 겹치는 축을 먼저 올려두는 편이 더 자연스러워요.",
      matchedCategoryIds,
      matchedCategoryNames,
      preferredPackage: signals.orderCount === 0 ? "7" : "all",
      sectionOrder: ["focus", "personalized", "comeback"],
      reasonLines: uniqueStrings(
        [
          signals.hasAssess ? "최근 정밀검사 결과가 있어요." : "",
          signals.hasQuick ? "최근 빠른검사 결과가 있어요." : "",
          `먼저 볼 축: ${matchedCategoryNames.join(", ")}`,
        ].filter(Boolean),
        3
      ),
      previousProductNames,
    };
  }

  if (
    signals.journeySegmentId === "safety_first_manager" ||
    signals.journeySegmentId === "guided_decider"
  ) {
    return {
      segment: "review",
      title: "지금은 무작정 많이 보기보다 먼저 확인할 축을 좁혀 보는 편이 좋아요",
      description:
        matchedCategoryNames.length > 0
          ? `${matchedCategoryNames.join(", ")} 중심으로 보되, 상담과 비교를 쉽게 이어가도록 정리해 둘게요.`
          : "상담이나 안전 맥락이 있어 상품을 넓게 보기보다 다음 확인 포인트부터 먼저 보이는 흐름이 더 자연스러워요.",
      helper:
        signals.healthRisk === "high"
          ? "건강링크 위험 신호가 높다면 과한 확장보다 가벼운 시작과 약사 확인이 더 중요해요."
          : "상담만 있었거나 안전 확인이 필요한 사람은 상품보다 다음 확인 포인트가 먼저 보여야 잘 움직입니다.",
      matchedCategoryIds,
      matchedCategoryNames,
      preferredPackage: "7",
      sectionOrder: ["focus", "comeback", "personalized"],
      reasonLines: uniqueStrings(
        [
          signals.healthRisk === "high" ? "건강링크 주의 신호가 있어요." : "",
          signals.hasPreviousConsultations ? "이전 상담 맥락이 남아 있어요." : "",
          matchedCategoryNames.length > 0
            ? `비교 우선 축: ${matchedCategoryNames.join(", ")}`
            : "",
        ].filter(Boolean),
        3
      ),
      previousProductNames,
    };
  }

  return {
    segment: "starter",
    title: "처음이라면 가볍게 시작할 수 있는 흐름부터 보여드릴게요",
    description:
      "아직 충분한 결과나 주문 이력이 없다면 부담을 줄이고 이해하기 쉬운 입문형 탐색 순서가 더 잘 맞아요.",
    helper:
      "처음 보는 사용자에게는 긴 옵션이나 많은 선택지보다 7일치와 핵심 성분부터 보는 편이 더 잘 움직여요.",
    matchedCategoryIds,
    matchedCategoryNames,
    preferredPackage: "7",
    sectionOrder: ["focus", "personalized", "comeback"],
    reasonLines: uniqueStrings(
      [
        signals.orderCount === 0 ? "아직 주문 이력이 없어요." : "",
        !signals.hasResults ? "최근 검사 결과가 아직 없어요." : "",
        "입문형 탐색부터 여는 편이 더 자연스러운 단계예요.",
      ].filter(Boolean),
      3
    ),
    previousProductNames,
  };
}

export function rankProductsForLandingPersonalization<T extends LandingProduct>(
  products: T[],
  focus: LandingPersonalizationFocus | null,
  selectedPharmacyId: number | null | undefined
) {
  if (!focus || products.length === 0) return products;

  const preferredPackage = focus.preferredPackage;
  const previousNameSet = new Set(
    focus.previousProductNames.map((name) => normalizeLabel(name))
  );
  const matchedCategoryIdSet = new Set(focus.matchedCategoryIds);
  const matchedCategoryNameSet = new Set(
    focus.matchedCategoryNames.map((name) => normalizeLabel(name))
  );

  return [...products].sort((left, right) => {
    const score = (product: T) => {
      let value = 0;
      const name = normalizeLabel(product.name);
      if (previousNameSet.has(name)) value += 6;

      const categories = product.categories || [];
      for (const category of categories) {
        if (
          (typeof category.id === "number" && matchedCategoryIdSet.has(category.id)) ||
          matchedCategoryNameSet.has(normalizeLabel(category.name))
        ) {
          value += 5;
        }
      }

      const options = (product.pharmacyProducts || []).filter((option) => {
        if (selectedPharmacyId == null) return true;
        const pharmacyId = option.pharmacyId ?? option.pharmacy?.id ?? null;
        return pharmacyId === selectedPharmacyId;
      });

      if (
        preferredPackage === "7" &&
        options.some((option) => (option.optionType || "").includes("7"))
      ) {
        value += 2;
      }

      if (
        preferredPackage === "30" &&
        options.some((option) => (option.optionType || "").includes("30"))
      ) {
        value += 2;
      }

      return value;
    };

    return score(right) - score(left);
  });
}
