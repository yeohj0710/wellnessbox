import type { UserContextSummary } from "@/lib/chat/context";

export type ComebackJourneySurface = "home-products" | "explore";
export type ComebackJourneySegment =
  | "result-only"
  | "consult-only"
  | "first-order"
  | "first-order-risky";
export type ComebackJourneyActionKind = "apply_trial_filters" | "open_chat";

export type ComebackJourneyAction = {
  id: string;
  surface: ComebackJourneySurface;
  segment: ComebackJourneySegment;
  actionKind: ComebackJourneyActionKind;
  intensity: "soft" | "medium" | "strong";
  title: string;
  description: string;
  helper: string;
  ctaLabel: string;
  href?: string;
  draftPrompt?: string;
  matchedCategoryIds: number[];
  matchedCategoryNames: string[];
  reasonLines: string[];
  dormantDays: number;
};

type DateLike = string | number | Date | null | undefined;

type ComebackJourneyFactInput = {
  orderCount: number;
  hasAssess: boolean;
  hasQuick: boolean;
  hasChat: boolean;
  lastOrderAt?: DateLike;
  lastAssessAt?: DateLike;
  lastQuickAt?: DateLike;
  lastChatAt?: DateLike;
  latestChatTitle?: string;
  matchedCategoryIds?: number[];
  matchedCategoryNames?: string[];
  summary?: UserContextSummary | null;
};

function toTimestamp(value: DateLike) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function daysSince(value: DateLike) {
  const timestamp = toTimestamp(value);
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

function hasRiskSignals(summary: UserContextSummary | null | undefined) {
  if (!summary) return false;
  if (summary.safetyEscalation.level !== "routine") return true;
  return (
    summary.healthLink?.riskLevel === "high" ||
    summary.healthLink?.riskLevel === "medium" ||
    (summary.profile?.medications.length ?? 0) > 0 ||
    (summary.profile?.conditions.length ?? 0) > 0 ||
    summary.notableResponses.some((item) => item.signal === "주의")
  );
}

function buildExploreHref(categoryIds: number[]) {
  const query = new URLSearchParams();
  query.set("package", "7");
  if (categoryIds.length > 0) {
    query.set("categories", categoryIds.join(","));
  }
  return `/explore?${query.toString()}#home-products`;
}

function buildChatHref(surface: ComebackJourneySurface, draftPrompt: string) {
  const query = new URLSearchParams();
  query.set("from", surface === "explore" ? "/explore" : "/");
  query.set("draft", draftPrompt);
  return `/chat?${query.toString()}`;
}

function formatCategoryText(names: string[]) {
  if (names.length === 0) return "지금 맞는 구성";
  return names.slice(0, 2).join(", ");
}

export function resolveComebackJourneyAction(
  input: ComebackJourneyFactInput & { surface: ComebackJourneySurface }
): ComebackJourneyAction | null {
  const lastResultDays = Math.min(
    daysSince(input.lastAssessAt),
    daysSince(input.lastQuickAt)
  );
  const lastChatDays = daysSince(input.lastChatAt);
  const lastOrderDays = daysSince(input.lastOrderAt);
  const matchedCategoryIds = (input.matchedCategoryIds || []).slice(0, 3);
  const matchedCategoryNames = (input.matchedCategoryNames || []).slice(0, 3);
  const resultSource = input.hasAssess ? "검사" : input.hasQuick ? "빠른검사" : "결과";
  const risky = hasRiskSignals(input.summary);
  const categoryText = formatCategoryText(matchedCategoryNames);

  if (input.orderCount === 0 && input.hasChat && lastChatDays >= 5) {
    const draftPrompt = `이전 상담${
      input.latestChatTitle ? `(${input.latestChatTitle})` : ""
    }을 이어서, 지금 다시 시작하기 좋은 후보 2개와 왜 지금 사기 좋은지 짧게 정리해줘. 부담 적은 선택을 우선해줘.`;
    return {
      id: `${input.surface}:consult-only`,
      surface: input.surface,
      segment: "consult-only",
      actionKind: "open_chat",
      intensity: lastChatDays >= 14 ? "strong" : "medium",
      title: "상담만 받고 멈췄다면, 지금은 후보를 2개로 다시 좁혀드릴게요",
      description:
        "이전 상담 내용을 처음부터 다시 볼 필요 없이, 지금 사기 쉬운 후보만 짧게 다시 추려서 복귀 부담을 줄여드릴 수 있어요.",
      helper: "오늘은 길게 묻기보다 바로 비교 가능한 1~2개만 정리하는 쪽이 복귀 전환에 더 좋아요.",
      ctaLabel: "이전 상담 이어서 보기",
      href: buildChatHref(input.surface, draftPrompt),
      draftPrompt,
      matchedCategoryIds,
      matchedCategoryNames,
      reasonLines: [
        `${lastChatDays}일 전 상담 기록은 남아 있지만 아직 주문으로 이어지지 않았어요.`,
        input.latestChatTitle
          ? `이전 상담 주제 "${input.latestChatTitle}"를 이어서 빠르게 다시 볼 수 있어요.`
          : "기존 상담 맥락을 살려 처음부터 다시 설명할 필요를 줄였어요.",
      ],
      dormantDays: lastChatDays,
    };
  }

  if (input.orderCount === 0 && (input.hasAssess || input.hasQuick) && lastResultDays >= 7) {
    if (risky) {
      const draftPrompt = `내 최근 ${resultSource} 결과와 건강/복약 맥락 기준으로 지금 시작해도 무리 없는 후보 1~2개와 주의할 점만 짧게 정리해줘. 과장 없이 설명해줘.`;
      return {
        id: `${input.surface}:result-only-risky`,
        surface: input.surface,
        segment: "result-only",
        actionKind: "open_chat",
        intensity: lastResultDays >= 21 ? "strong" : "medium",
        title: `${resultSource} 결과는 남아 있으니, 이번엔 약사와 안전하게 다시 시작해보세요`,
        description:
          "한 번 보고 끝내기보다 현재 복약·건강 맥락까지 같이 묶어야 실제 구매까지 이어질 확률이 더 높아요.",
        helper: "결과는 이미 있으니 오늘은 설명보다 바로 시작 가능한 후보와 주의점만 짧게 정리하는 흐름이 좋아요.",
        ctaLabel: "결과 기준으로 다시 점검하기",
        href: buildChatHref(input.surface, draftPrompt),
        draftPrompt,
        matchedCategoryIds,
        matchedCategoryNames,
        reasonLines: [
          `${resultSource} 후 ${lastResultDays}일이 지나면서 첫 구매 진입이 끊긴 상태예요.`,
          input.summary?.explainability.pharmacistReviewPoints[0] ||
            "복약·건강 신호가 있어 이번 복귀는 상담형 진입이 더 안전해요.",
        ],
        dormantDays: lastResultDays,
      };
    }

    return {
      id: `${input.surface}:result-only`,
      surface: input.surface,
      segment: "result-only",
      actionKind: "apply_trial_filters",
      intensity: lastResultDays >= 21 ? "strong" : "medium",
      title: `${resultSource}만 하고 멈췄다면, ${categoryText}부터 7일치로 가볍게 시작해보세요`,
      description:
        "결과는 이미 있으니 다시 긴 탐색을 하기보다, 지금 맞는 방향만 바로 좁혀서 첫 구매까지 가는 편이 훨씬 자연스러워요.",
      helper:
        matchedCategoryNames.length > 0
          ? `복귀 첫 진입은 ${categoryText} 위주로만 보여드릴게요.`
          : "복귀 첫 진입은 7일치 상품 위주로만 보여드릴게요.",
      ctaLabel: "7일치부터 다시 보기",
      href: buildExploreHref(matchedCategoryIds),
      matchedCategoryIds,
      matchedCategoryNames,
      reasonLines: [
        `${resultSource} 결과 후 ${lastResultDays}일이 지나 관심은 있었지만 아직 구매로 이어지지 않았어요.`,
        matchedCategoryNames.length > 0
          ? `${categoryText} 중심으로 선택지를 줄이면 첫 구매 부담이 확실히 낮아져요.`
          : "지금은 선택지를 줄이고 7일치부터 보는 편이 복귀 전환에 더 유리해요.",
      ],
      dormantDays: lastResultDays,
    };
  }

  if (input.orderCount === 1 && lastOrderDays >= 35) {
    if (risky) {
      const draftPrompt =
        "첫 주문 후 한동안 쉬었어. 지난 주문 기준으로 유지할 점 1개와 약사와 점검할 조정 포인트 2개만 짧게 정리해줘.";
      return {
        id: `${input.surface}:first-order-risky`,
        surface: input.surface,
        segment: "first-order-risky",
        actionKind: "open_chat",
        intensity: lastOrderDays >= 60 ? "strong" : "medium",
        title: "첫 주문 뒤 멈췄다면, 다시 사기 전 조정 포인트부터 짧게 점검해보세요",
        description:
          "한 번 써본 뒤 쉬는 구간에서는 같은 구성을 그대로 반복하기보다, 무엇을 유지하고 무엇을 줄일지 먼저 보는 편이 복귀 구매로 더 잘 이어져요.",
        helper: "이번 복귀는 새로 늘리기보다 지난 주문을 현재 몸 상태에 맞게 조정하는 흐름이 더 안전해요.",
        ctaLabel: "지난 주문 기준으로 다시 점검하기",
        href: buildChatHref(input.surface, draftPrompt),
        draftPrompt,
        matchedCategoryIds,
        matchedCategoryNames,
        reasonLines: [
          `첫 주문 후 ${lastOrderDays}일째라 동일 구성 반복보다 재조정형 복귀가 더 자연스러워요.`,
          input.summary?.explainability.pharmacistReviewPoints[0] ||
            "복약·건강 맥락이 보여 이번엔 조정 상담을 먼저 붙이는 편이 좋아요.",
        ],
        dormantDays: lastOrderDays,
      };
    }

    return {
      id: `${input.surface}:first-order`,
      surface: input.surface,
      segment: "first-order",
      actionKind: "apply_trial_filters",
      intensity: lastOrderDays >= 60 ? "strong" : "medium",
      title: "첫 주문 뒤 쉬었다면, 같은 부담으로 다시 사지 말고 7일치로 재시작해보세요",
      description:
        "한 번 주문한 사용자는 완전 신규보다 다시 돌아올 이유만 분명하면 복귀하기 쉬워요. 그래서 이번엔 낮은 부담의 7일치 재진입으로 바로 연결해드릴게요.",
      helper:
        matchedCategoryNames.length > 0
          ? `${categoryText} 방향부터 다시 보면 예전 선택을 그대로 반복하지 않아도 돼요.`
          : "이번 복귀는 예전 구성을 그대로 반복하기보다 7일치로 부담을 낮추는 편이 좋아요.",
      ctaLabel: "가볍게 다시 시작하기",
      href: buildExploreHref(matchedCategoryIds),
      matchedCategoryIds,
      matchedCategoryNames,
      reasonLines: [
        `첫 주문 후 ${lastOrderDays}일째라 재구매보다 재시작 설계가 더 중요한 구간이에요.`,
        matchedCategoryNames.length > 0
          ? `${categoryText}처럼 예전에 맞았던 방향만 다시 좁혀서 보여드릴 수 있어요.`
          : "지금은 선택지를 줄여야 복귀 장벽이 낮아져요.",
      ],
      dormantDays: lastOrderDays,
    };
  }

  return null;
}
