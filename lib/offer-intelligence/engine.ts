import { resolveMatchedCategoriesByLabels } from "@/lib/ai-capabilities/personalization";
import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";
import { governCopyModel } from "@/lib/copy-governance";
import { resolvePricePerception } from "@/lib/price-perception/engine";
import type { NormalizedAllResults } from "@/app/chat/hooks/useChat.results";

export type OfferCategory = {
  id: number;
  name: string;
};

export type CheckoutOfferItem = {
  productId: number;
  name: string;
  optionType: string;
  categories: string[];
};

export type OfferAction =
  | {
      type: "apply_package";
      label: string;
      packageTarget: "all" | "7" | "30";
      categoryIds: number[];
    }
  | {
      type: "bulk_change";
      label: string;
      target: "7일치" | "30일치";
    }
  | {
      type: "link";
      label: string;
      href: string;
    };

export type OfferCardModel = {
  segment: "starter" | "confidence" | "review" | "returning";
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  chips: string[];
  priceFrameLabel: string;
  priceFrameHelper: string;
  primaryAction?: OfferAction;
  secondaryAction?: OfferAction;
};

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
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function parseOptionDays(optionType: string | null | undefined) {
  const text = (optionType || "").trim();
  if (!text) return null;

  const match = text.match(/(\d+)\s*(?:일|day|days)/i);
  if (match) return Number.parseInt(match[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function sortOrdersByCreatedAt(remoteResults: NormalizedAllResults | null) {
  return [...(remoteResults?.orders || [])].sort((left, right) => {
    const leftAt = toDate(left.createdAt)?.getTime() ?? 0;
    const rightAt = toDate(right.createdAt)?.getTime() ?? 0;
    return rightAt - leftAt;
  });
}

function getPreviousProductNames(remoteResults: NormalizedAllResults | null) {
  const latestOrder = sortOrdersByCreatedAt(remoteResults)[0];
  return uniqueStrings(
    (latestOrder?.items || []).map((item) => item.name).filter(Boolean),
    3
  );
}

function getLatestOrderDays(remoteResults: NormalizedAllResults | null) {
  return daysSince(sortOrdersByCreatedAt(remoteResults)[0]?.createdAt);
}

function getCheckoutThemeNames(items: CheckoutOfferItem[]) {
  return uniqueStrings(
    items.flatMap((item) => item.categories).filter(Boolean),
    4
  );
}

function buildPriceFrame(summary: UserContextSummary, remoteResults: NormalizedAllResults | null, options?: {
  totalPrice?: number;
  itemCount?: number;
  hasLongPackage?: boolean;
}) {
  const perception = resolvePricePerception({
    summary,
    remoteResults,
    totalPrice: options?.totalPrice,
    itemCount: options?.itemCount,
    hasLongPackage: options?.hasLongPackage,
  });

  return {
    label: perception.badgeLabel,
    helper: perception.headline,
    mode: perception.mode,
    reasonLines: perception.reasonLines,
    shouldLeadWithTrial: perception.shouldLeadWithTrial,
    shouldLeadWithExplanation: perception.shouldLeadWithExplanation,
    shouldAvoidUpsell: perception.shouldAvoidUpsell,
  };
}

function finalizeOfferCard(model: OfferCardModel): OfferCardModel {
  return governCopyModel(model);
}

export function resolveHomeOfferCard(input: {
  summary: UserContextSummary;
  remoteResults: NormalizedAllResults | null;
  categories: OfferCategory[];
}): OfferCardModel | null {
  if (input.categories.length === 0) return null;

  const matchedCategories = resolveMatchedCategoriesByLabels(
    input.summary.recommendedNutrients,
    input.categories
  );
  const signals = buildUserCapabilitySignals(input.summary);
  const matchedCategoryIds = matchedCategories.map((category) => category.id);
  const matchedCategoryNames = matchedCategories.map((category) => category.name);
  const orderCount = input.remoteResults?.orders.length ?? 0;
  const lastOrderDays = getLatestOrderDays(input.remoteResults);
  const previousProductNames = getPreviousProductNames(input.remoteResults);
  const frame = buildPriceFrame(input.summary, input.remoteResults, {
    itemCount: matchedCategoryIds.length,
  });

  if (orderCount > 0 && lastOrderDays != null && lastOrderDays >= 28) {
    return finalizeOfferCard({
      segment: "returning",
      badgeLabel: "복귀 오퍼",
      title:
        frame.mode === "price_sensitive"
          ? "다시 시작은 예전 강도보다 7일치 재시작이 더 잘 맞아요"
          : "다시 시작할 때도 예전 구성을 바로 반복하기보다 지금 맞는 축부터 다시 보는 편이 더 자연스러워요",
      description:
        previousProductNames.length > 0
          ? `최근 주문한 ${previousProductNames.join(", ")} 흐름을 참고하되, 이번엔 지금 리듬에 맞는 강도로 다시 비교해보세요.`
          : "오랜 공백 뒤에는 예전 구성을 그대로 반복하기보다 지금 내 상태에 맞는 시작 강도로 다시 붙는 편이 부담이 적어요.",
      helper:
        frame.mode === "price_sensitive"
          ? "할인을 더 키우기보다 다시 시작 부담을 줄여 주는 구성이 복귀 전환에 더 잘 맞아요."
          : "가격만 다시 보여주기보다 왜 이번엔 가볍게 다시 붙는 편이 맞는지 먼저 이해되게 만드는 쪽이 복귀 전환에 더 좋아요.",
      reasonLines: uniqueStrings(
        [
          lastOrderDays != null ? `마지막 주문 후 ${lastOrderDays}일이 지났어요.` : "",
          previousProductNames.length > 0
            ? `이전 주문 흐름: ${previousProductNames.join(", ")}`
            : "",
          ...frame.reasonLines,
        ].filter(Boolean),
        3
      ),
      chips: matchedCategoryNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction: {
        type: "apply_package",
        label: "7일치부터 다시 보기",
        packageTarget: "7",
        categoryIds: matchedCategoryIds,
      },
      secondaryAction:
        matchedCategoryIds.length > 0
          ? {
              type: "apply_package",
              label: frame.shouldLeadWithExplanation ? "맞는 축부터 다시 보기" : "맞는 성분만 보기",
              packageTarget: "all",
              categoryIds: matchedCategoryIds,
            }
          : undefined,
    });
  }

  if (frame.mode === "trust_first") {
    return finalizeOfferCard({
      segment: "review",
      badgeLabel: "설명 우선 오퍼",
      title: "지금은 싸게 보이게 만드는 것보다 왜 맞는지 먼저 납득되는 편이 더 중요해요",
      description:
        matchedCategoryNames.length > 0
          ? `${matchedCategoryNames.join(", ")} 축이 왜 지금 사용자에게 먼저 보이는지 이해되면, 가격 메시지를 세게 밀지 않아도 다음 행동이 더 자연스럽게 이어져요.`
          : "지금 단계에서는 넓은 혜택보다 근거와 조정 가능성을 먼저 보여주는 편이 신뢰와 전환을 같이 지켜줘요.",
      helper:
        "안전·상담·기록 맥락이 있는 사용자는 가격 자극보다 설명과 검토 포인트가 먼저 설득력이 생겨요.",
      reasonLines: uniqueStrings(
        [
          ...frame.reasonLines,
          matchedCategoryNames.length > 0
            ? `지금 우선으로 보이는 축: ${matchedCategoryNames.join(", ")}`
            : "",
        ].filter(Boolean),
        3
      ),
      chips: matchedCategoryNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction:
        matchedCategoryIds.length > 0
          ? {
              type: "apply_package",
              label: "맞는 축부터 보기",
              packageTarget: "all",
              categoryIds: matchedCategoryIds,
            }
          : {
              type: "apply_package",
              label: "7일치부터 비교하기",
              packageTarget: "7",
              categoryIds: matchedCategoryIds,
            },
      secondaryAction: {
        type: "link",
        label: "약사와 먼저 점검하기",
        href: "/chat?from=offer-home",
      },
    });
  }

  if (
    orderCount === 0 &&
    matchedCategoryIds.length > 0 &&
    signals.evidenceScore >= 4 &&
    !signals.isSafetySensitive &&
    !frame.shouldAvoidUpsell
  ) {
    return finalizeOfferCard({
      segment: "confidence",
      badgeLabel: "가치 비교 오퍼",
      title: "지금 기록이라면 30일 패키지도 함께 비교해볼 수 있어요",
      description: `${matchedCategoryNames.join(", ")} 축이 반복해서 보여서, 이번에는 7일치만이 아니라 30일 패키지까지 같이 비교해도 괜찮은 단계예요.`,
      helper:
        "무조건 길게 권하지 않고, 최근 기록이 충분히 쌓였을 때만 비교 선택지를 조금 넓혀드릴게요.",
      reasonLines: uniqueStrings(
        [
          input.summary.latestAssess ? "최근 정밀검사 결과가 있어요." : "",
          input.summary.latestQuick ? "최근 빠른검사 결과가 있어요." : "",
          ...frame.reasonLines,
        ].filter(Boolean),
        3
      ),
      chips: matchedCategoryNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction: {
        type: "apply_package",
        label: "30일 패키지부터 보기",
        packageTarget: "30",
        categoryIds: matchedCategoryIds,
      },
      secondaryAction: {
        type: "apply_package",
        label: "7일치로 가볍게 보기",
        packageTarget: "7",
        categoryIds: matchedCategoryIds,
      },
    });
  }

  return finalizeOfferCard({
    segment: "starter",
    badgeLabel: "첫 구매 오퍼",
    title:
      frame.mode === "price_sensitive"
        ? "첫 시작은 가격을 더 세게 미는 것보다 시작 부담을 낮추는 쪽이 더 잘 맞아요"
        : "처음에는 큰 혜택보다 내게 맞는 축부터 짧게 확인해 보는 편이 더 자연스러워요",
    description:
      matchedCategoryNames.length > 0
        ? `${matchedCategoryNames.join(", ")} 축부터 7일치로 비교하면 가격만으로 밀지 않아도 지금 나와 맞는지 빠르게 감이 와요.`
        : "처음에는 7일치부터 비교하고 맞는 축이 보일 때 그다음 단계를 넓혀도 늦지 않아요.",
    helper:
      frame.mode === "price_sensitive"
        ? "할인 폭보다 시작 강도를 낮추는 쪽이 첫 구매 망설임을 더 크게 줄여줘요."
        : "처음부터 혜택을 크게 뿌리기보다 이해와 공감을 먼저 붙이는 편이 장기 신뢰에도 더 좋아요.",
    reasonLines: uniqueStrings(
      [
        orderCount === 0 ? "아직 주문 이력이 없어요." : "",
        matchedCategoryNames.length > 0
          ? `먼저 보기 좋은 축: ${matchedCategoryNames.join(", ")}`
          : "",
        ...frame.reasonLines,
      ].filter(Boolean),
      3
    ),
    chips: matchedCategoryNames,
    priceFrameLabel: frame.label,
    priceFrameHelper: frame.helper,
    primaryAction: {
      type: "apply_package",
      label: "7일치부터 보기",
      packageTarget: "7",
      categoryIds: matchedCategoryIds,
    },
    secondaryAction:
      matchedCategoryIds.length > 0
        ? {
            type: "apply_package",
            label: frame.shouldLeadWithExplanation ? "맞는 축부터 보기" : "맞는 성분만 보기",
            packageTarget: "all",
            categoryIds: matchedCategoryIds,
          }
        : undefined,
  });
}

export function resolveCheckoutOfferCard(input: {
  summary: UserContextSummary;
  remoteResults: NormalizedAllResults | null;
  items: CheckoutOfferItem[];
  totalPrice: number;
}): OfferCardModel | null {
  if (input.totalPrice <= 0 || input.items.length === 0) return null;

  const signals = buildUserCapabilitySignals(input.summary);
  const orderCount = input.remoteResults?.orders.length ?? 0;
  const lastOrderDays = getLatestOrderDays(input.remoteResults);
  const safetySensitive = signals.isSafetySensitive;
  const themeNames = getCheckoutThemeNames(input.items);
  const optionDays = input.items
    .map((item) => parseOptionDays(item.optionType))
    .filter((value): value is number => typeof value === "number");
  const hasLongPackage = input.items.some((item) => {
    const days = parseOptionDays(item.optionType);
    return (typeof days === "number" && days >= 30) || item.optionType.includes("일반");
  });
  const allTrialPackage = optionDays.length > 0 && optionDays.every((days) => days <= 7);
  const frame = buildPriceFrame(input.summary, input.remoteResults, {
    totalPrice: input.totalPrice,
    itemCount: input.items.length,
    hasLongPackage,
  });

  if (safetySensitive || frame.mode === "trust_first") {
    return finalizeOfferCard({
      segment: "review",
      badgeLabel: "결제 전 확인",
      title: "이 사용자에겐 가격 메시지보다 왜 이 구성이 맞는지와 조정 가능성이 더 중요해요",
      description:
        "건강·복용·상담 맥락이 보일 때는 무리하게 결제만 밀기보다 필요한 상품만 남기거나 약사와 먼저 점검하는 편이 더 안전하고 더 신뢰를 지켜줘요.",
      helper:
        "할인을 세게 붙이지 않아도, 결제 전 불안을 줄여 주는 설명이 오히려 구매 완료율을 더 잘 지켜줄 수 있어요.",
      reasonLines: uniqueStrings(
        [
          input.summary.healthLink?.riskLevel === "high"
            ? "건강링크 주의 신호가 있어요."
            : "",
          (input.summary.profile?.medications.length ?? 0) > 0
            ? "복용약 정보가 있어 결제 전 확인이 더 중요해요."
            : "",
          ...frame.reasonLines,
        ].filter(Boolean),
        3
      ),
      chips: themeNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction: {
        type: "link",
        label: "약사와 먼저 점검하기",
        href: "/chat?from=checkout-offer",
      },
      secondaryAction:
        hasLongPackage
          ? {
              type: "bulk_change",
              label: "전체 7일치로 낮춰 보기",
              target: "7일치",
            }
          : undefined,
    });
  }

  if (
    frame.mode === "price_sensitive" &&
    orderCount === 0 &&
    (hasLongPackage || input.totalPrice >= 80000 || input.items.length >= 3)
  ) {
    return finalizeOfferCard({
      segment: "starter",
      badgeLabel: "부담 낮추기",
      title: "지금은 할인보다 시작 부담을 줄여 주는 조정이 더 잘 먹혀요",
      description:
        "첫 구매에서 총액과 선택 부담이 같이 올라가면 망설임이 커져요. 장바구니를 7일치 중심으로 바꿔서 먼저 반응을 보는 흐름이 더 자연스러워요.",
      helper:
        "같은 상품을 더 싸게 보이게 하기보다 시작 강도 자체를 낮춰 주는 편이 포기와 결제 이탈을 같이 줄여줘요.",
      reasonLines: uniqueStrings(
        [
          hasLongPackage ? "30일 이상 옵션이 함께 담겨 있어요." : "",
          input.totalPrice >= 80000
            ? `현재 총액은 ${input.totalPrice.toLocaleString()}원이에요.`
            : "",
          input.items.length >= 3 ? `${input.items.length}개 상품이 함께 담겨 있어요.` : "",
          ...frame.reasonLines,
        ].filter(Boolean),
        3
      ),
      chips: themeNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction: {
        type: "bulk_change",
        label: "전체 7일치로 맞추기",
        target: "7일치",
      },
    });
  }

  if (
    frame.mode === "value_balanced" &&
    orderCount > 0 &&
    lastOrderDays != null &&
    lastOrderDays <= 45 &&
    allTrialPackage
  ) {
    return finalizeOfferCard({
      segment: "confidence",
      badgeLabel: "리필 가치 비교",
      title: "이번엔 7일치 반복보다 30일 패키지가 더 자연스러울 수 있어요",
      description:
        "최근 주문 간격을 보면 이미 다시 살 가능성이 높은 흐름이에요. 이번에는 30일 패키지로 맞춰두면 자주 다시 담는 번거로움을 줄일 수 있어요.",
      helper:
        "반응 가능성이 높을 때만 비교 폭을 조금 넓히고, 그렇지 않으면 무리하게 길게 권하지 않아요.",
      reasonLines: uniqueStrings(
        [
          `마지막 주문 후 ${lastOrderDays}일째예요.`,
          themeNames.length > 0 ? `현재 장바구니 축: ${themeNames.join(", ")}` : "",
          "지금 장바구니는 7일치 위주예요.",
        ].filter(Boolean),
        3
      ),
      chips: themeNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction: {
        type: "bulk_change",
        label: "전체 30일치로 맞추기",
        target: "30일치",
      },
    });
  }

  if (frame.mode === "price_sensitive") {
    return finalizeOfferCard({
      segment: "starter",
      badgeLabel: "결제 부담 낮추기",
      title: "지금은 혜택을 더 붙이기보다 선택 부담을 줄이는 편이 더 중요해요",
      description:
        "이 사용자는 가격 자체보다도 지금 결정을 얼마나 가볍게 만들 수 있는지가 더 크게 작동해요. 축을 줄이거나 7일치로 시작해도 충분해요.",
      helper:
        "할인을 키우지 않아도 구성 강도와 비교 범위를 낮추면 결제 직전 망설임을 줄일 수 있어요.",
      reasonLines: frame.reasonLines,
      chips: themeNames,
      priceFrameLabel: frame.label,
      priceFrameHelper: frame.helper,
      primaryAction:
        hasLongPackage
          ? {
              type: "bulk_change",
              label: "전체 7일치로 맞추기",
              target: "7일치",
            }
          : undefined,
    });
  }

  return finalizeOfferCard({
    segment: "confidence",
    badgeLabel: "가치 설명",
    title: "이 장바구니는 가격만이 아니라 왜 이 조합인지가 함께 읽혀야 더 잘 움직여요",
    description:
      themeNames.length > 0
        ? `${themeNames.join(", ")} 축이 함께 담겨 있어 지금은 추가 할인보다 구성 의도와 사용 강도를 이해시키는 편이 더 설득력이 있어요.`
        : "지금 장바구니는 혜택을 더 붙이기보다 구성 의도와 시작 강도를 짚어 주는 편이 더 자연스러워요.",
    helper:
      "가격을 과하게 흔들지 않아도 사용자가 '왜 이 정도가 맞는지' 납득되면 결제 전 포기를 줄일 수 있어요.",
    reasonLines: uniqueStrings(
      [...frame.reasonLines, themeNames.length > 0 ? `현재 장바구니 축: ${themeNames.join(", ")}` : ""].filter(Boolean),
      3
    ),
    chips: themeNames,
    priceFrameLabel: frame.label,
    priceFrameHelper: frame.helper,
  });
}
