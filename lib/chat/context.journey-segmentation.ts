import { uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

type JourneySegment = UserContextSummary["journeySegment"];

function parseDate(value: string | null | undefined) {
  if (!value || value === "-") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysSince(value: string | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

function latestResultAge(input: {
  latestAssess: UserContextSummary["latestAssess"];
  latestQuick: UserContextSummary["latestQuick"];
}) {
  return Math.min(
    daysSince(input.latestAssess?.testedAt),
    daysSince(input.latestQuick?.testedAt)
  );
}

function hasRecentConsultation(
  previousConsultations: UserContextSummary["previousConsultations"],
  withinDays = 21
) {
  return daysSince(previousConsultations[0]?.updatedAt) <= withinDays;
}

function hasRecentOrder(
  recentOrders: UserContextSummary["recentOrders"],
  withinDays = 45
) {
  return daysSince(recentOrders[0]?.orderedAt) <= withinDays;
}

export function buildJourneySegmentSummary(input: {
  profile: UserContextSummary["profile"];
  recentOrders: UserContextSummary["recentOrders"];
  latestAssess: UserContextSummary["latestAssess"];
  latestQuick: UserContextSummary["latestQuick"];
  healthLink: UserContextSummary["healthLink"];
  previousConsultations: UserContextSummary["previousConsultations"];
  recommendedNutrients: UserContextSummary["recommendedNutrients"];
  notableResponses: UserContextSummary["notableResponses"];
  safetyEscalation: UserContextSummary["safetyEscalation"];
  consultationImpact: UserContextSummary["consultationImpact"];
}): JourneySegment {
  const resultAgeDays = latestResultAge(input);
  const orderCount = input.recentOrders.length;
  const recentOrder = hasRecentOrder(input.recentOrders);
  const recentConsult = hasRecentConsultation(input.previousConsultations);
  const healthRisk = input.healthLink?.riskLevel ?? "unknown";
  const medicationCount = input.profile?.medications.length ?? 0;
  const conditionCount = input.profile?.conditions.length ?? 0;
  const hasResults = Boolean(input.latestAssess || input.latestQuick);
  const hasRecommended = input.recommendedNutrients.length > 0;
  const hasCautionResponses = input.notableResponses.some(
    (item) => item.signal === "주의"
  );
  const isSafetyFirst =
    input.safetyEscalation.level !== "routine" ||
    healthRisk === "high" ||
    healthRisk === "medium" ||
    medicationCount > 0 ||
    conditionCount > 0 ||
    hasCautionResponses;

  if (isSafetyFirst) {
    return {
      id: "safety_first_manager",
      label: "안전 확인형",
      headline: "지금은 추천보다 안전 확인이 먼저인 상태로 읽혀요",
      summary:
        "복용약, 주의 질환, 건강링크 위험 신호가 함께 보이면 무엇을 더 살지보다 무엇을 먼저 확인할지가 더 중요합니다.",
      helper:
        "홈과 탐색에서는 가벼운 시작과 상담 연결을 먼저 보여주고, 채팅에서는 추가 확인 질문을 우선합니다.",
      reasonLines: uniq(
        [
          input.safetyEscalation.reasonLines[0] || "",
          medicationCount > 0 ? `복용약 맥락 ${medicationCount}건이 있어요.` : "",
          conditionCount > 0 ? `질환/주의 맥락 ${conditionCount}건이 있어요.` : "",
          healthRisk === "high" || healthRisk === "medium"
            ? `건강링크 위험도는 ${healthRisk}로 읽혀요.`
            : "",
        ].filter(Boolean),
        3
      ),
      homeOrder: ["segment", "focus", "comeback", "personalized"],
      exploreOrder: ["router", "segment", "nextBest", "focus", "education", "comeback"],
      chatPrompt: "복용약과 건강 맥락 기준으로 지금 먼저 조심할 점과 추가로 확인할 정보를 2가지씩 정리해줘.",
    };
  }

  if (
    recentOrder &&
    (orderCount >= 2 || input.consultationImpact.stage === "retention_ready")
  ) {
    return {
      id: "steady_maintainer",
      label: "유지 최적화형",
      headline: "이미 시작한 흐름을 더 오래 가게 만드는 쪽이 잘 맞아요",
      summary:
        "최근 주문과 상담 흐름이 이어져 있어서 새로 넓히기보다 유지, 리필, 체감 점검을 더 강하게 붙이는 편이 좋습니다.",
      helper:
        "홈과 탐색에서는 익숙한 축을 먼저 보여주고, 채팅에서는 유지할 것과 조정할 것을 1개씩 좁혀 묻습니다.",
      reasonLines: uniq(
        [
          orderCount > 0 ? `최근 주문 ${orderCount}건이 이어져 있어요.` : "",
          input.recentOrders[0]?.items[0]
            ? `가장 최근 주문은 ${input.recentOrders[0].items[0]} 중심이었어요.`
            : "",
          recentConsult ? "상담 흐름도 최근까지 이어졌어요." : "",
        ].filter(Boolean),
        3
      ),
      homeOrder: ["segment", "comeback", "focus", "personalized"],
      exploreOrder: ["router", "segment", "comeback", "focus", "education", "nextBest"],
      chatPrompt: "최근 복용 흐름 기준으로 유지할 것과 바꿔볼 것 1개씩만 짧게 정리해줘.",
    };
  }

  if (orderCount > 0 && !recentOrder) {
    return {
      id: "drifting_returner",
      label: "복귀 재시작형",
      headline: "예전 구성 그대로보다 가볍게 다시 붙는 경로가 더 중요해요",
      summary:
        "주문 이력은 있지만 최근 흐름이 끊겨 있어서 이전 강도를 그대로 반복하기보다 재시작 부담을 낮추는 편이 잘 맞습니다.",
      helper:
        "홈과 탐색에서는 7일치 재진입과 익숙한 성분 재확인을 먼저 보여주고, 채팅에서는 다시 시작할 최소 구성으로 좁힙니다.",
      reasonLines: uniq(
        [
          input.recentOrders[0]?.orderedAt
            ? `마지막 주문은 ${input.recentOrders[0].orderedAt} 기준이에요.`
            : "",
          resultAgeDays < Number.POSITIVE_INFINITY
            ? `최근 결과는 ${resultAgeDays}일 전 데이터예요.`
            : "최근 결과도 오래돼 다시 기준을 잡는 편이 좋아요.",
          input.recommendedNutrients[0]
            ? `다시 볼 축은 ${input.recommendedNutrients.slice(0, 2).join(", ")} 쪽이에요.`
            : "",
        ].filter(Boolean),
        3
      ),
      homeOrder: ["segment", "comeback", "focus", "personalized"],
      exploreOrder: ["router", "segment", "comeback", "focus", "nextBest", "education"],
      chatPrompt: "예전 구성에서 다시 시작할 때 덜어낼 것과 다시 붙일 것만 간단히 정리해줘.",
    };
  }

  if (
    orderCount === 0 &&
    input.previousConsultations.length > 0 &&
    (input.consultationImpact.stage === "ready_to_buy" ||
      input.consultationImpact.stage === "stalled_in_consult" ||
      input.consultationImpact.stage === "needs_narrowing")
  ) {
    return {
      id: "guided_decider",
      label: "결정 보조형",
      headline: "지금은 더 많은 추천보다 선택지를 줄여주는 쪽이 잘 먹혀요",
      summary:
        "상담은 있었지만 아직 구매로 이어지지 않았다면 정보를 더 주는 것보다 지금 후보를 1~2개로 좁혀주는 편이 효율적입니다.",
      helper:
        "홈과 탐색에서는 상담 재진입과 비교 축을 먼저 보여주고, 채팅에서는 왜 지금 안 사고 있는지부터 좁혀 묻습니다.",
      reasonLines: uniq(
        [
          input.consultationImpact.headline,
          input.consultationImpact.evidence[0] || "",
          hasRecommended
            ? `추천 축은 ${input.recommendedNutrients.slice(0, 2).join(", ")}로 모이고 있어요.`
            : "",
        ].filter(Boolean),
        3
      ),
      homeOrder: ["segment", "focus", "personalized", "comeback"],
      exploreOrder: ["router", "segment", "nextBest", "focus", "comeback", "education"],
      chatPrompt: "지금 후보를 1~2개로 좁히고 왜 그 조합이 맞는지 짧게 정리해줘.",
    };
  }

  if (orderCount === 0 && (hasResults || hasRecommended)) {
    return {
      id: "goal_driven_builder",
      label: "목표 추진형",
      headline: "지금은 내 목표와 결과를 바로 탐색으로 연결하는 흐름이 맞아요",
      summary:
        "검사나 건강 목표가 어느 정도 모여 있어서 막연한 입문보다 맞는 축을 먼저 보고 7일치로 시작하는 편이 잘 맞습니다.",
      helper:
        "홈과 탐색에서는 맞는 성분과 입문 강도를 앞에 두고, 채팅에서는 목표 기준 우선순위를 빠르게 정리합니다.",
      reasonLines: uniq(
        [
          hasResults ? "최근 검사 결과가 이미 쌓여 있어요." : "",
          input.recommendedNutrients[0]
            ? `현재 읽히는 핵심 축은 ${input.recommendedNutrients.slice(0, 3).join(", ")}예요.`
            : "",
          input.profile?.goals[0]
            ? `가장 앞 목표는 ${input.profile.goals[0]}예요.`
            : "",
        ].filter(Boolean),
        3
      ),
      homeOrder: ["segment", "focus", "personalized", "comeback"],
      exploreOrder: ["router", "segment", "focus", "education", "nextBest", "comeback"],
      chatPrompt: "내 목표 기준으로 먼저 볼 성분과 7일치 시작안을 짧게 정리해줘.",
    };
  }

  return {
    id: "starter_explorer",
    label: "입문 탐색형",
    headline: "지금은 선택지를 줄여서 첫 기준을 만드는 단계로 읽혀요",
    summary:
      "아직 주문이나 검사 맥락이 얕다면 상품을 넓게 많이 보여주기보다 빠르게 첫 기준을 만들어 주는 편이 더 도움이 됩니다.",
    helper:
      "홈과 탐색에서는 빠른검사와 입문형 구성을 먼저 노출하고, 채팅에서는 목표와 생활 고민을 짧게 정리하는 흐름으로 갑니다.",
    reasonLines: uniq(
      [
        orderCount === 0 ? "아직 주문 이력이 없어요." : "",
        !hasResults ? "최근 검사 결과가 아직 없어요." : "",
        input.profile?.goals[0]
          ? `현재 등록된 목표는 ${input.profile.goals[0]}예요.`
          : "먼저 목표를 짧게 잡아주면 다음 추천 정확도가 올라가요.",
      ].filter(Boolean),
      3
    ),
    homeOrder: ["segment", "focus", "personalized", "comeback"],
    exploreOrder: ["router", "segment", "focus", "education", "nextBest", "comeback"],
    chatPrompt: "처음 시작 기준으로 무엇부터 확인하면 좋을지 간단히 정리해줘.",
  };
}
