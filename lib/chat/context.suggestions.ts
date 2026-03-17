import { clamp } from "./context.base";
import type { UserContextSummary } from "./context.types";

function buildDataCollectionQuestions() {
  return [
    "내가 복용 중인 영양제와 약 기준으로 중복되거나 주의할 성분을 먼저 정리해줘.",
    "내 목표 1가지를 기준으로 2주 복용 루틴을 아침/저녁으로 나눠 정리해줘.",
    "최근 불편 증상 기준으로 이번 주 체크리스트를 3가지로 정리해줘.",
  ];
}

function buildJourneySegmentSuggestions(summary: UserContextSummary) {
  switch (summary.journeySegment.id) {
    case "safety_first_manager":
      return [
        summary.journeySegment.chatPrompt,
        "지금은 무엇을 더 먹을지보다 먼저 확인할 복용약·질환 맥락을 2가지로 정리해줘.",
      ];
    case "steady_maintainer":
      return [
        summary.journeySegment.chatPrompt,
        "최근 복용 흐름 기준으로 유지할 점과 과한 점을 1개씩만 정리해줘.",
      ];
    case "drifting_returner":
      return [
        summary.journeySegment.chatPrompt,
        "예전 구성에서 다시 시작할 때 7일치로 낮춰 볼 축을 먼저 정리해줘.",
      ];
    case "guided_decider":
      return [
        summary.journeySegment.chatPrompt,
        "후보를 1~2개로 좁히고 왜 아직 구매가 안 붙는지까지 같이 정리해줘.",
      ];
    case "goal_driven_builder":
      return [
        summary.journeySegment.chatPrompt,
        "지금 목표 기준으로 먼저 볼 성분과 7일치 시작안을 간단히 정리해줘.",
      ];
    default:
      return [
        summary.journeySegment.chatPrompt,
        "처음 시작 기준으로 무엇부터 확인하면 좋을지 간단히 정리해줘.",
      ];
  }
}

function normalizeSuggestionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

function classifySuggestionIntent(value: string) {
  const text = value.replace(/\s+/g, "");
  if (/(루틴|복용시간|아침|저녁|순서)/.test(text)) return "schedule";
  if (/(중복|과다|상호작용|주의|안전|약사|점검)/.test(text)) return "safety";
  if (/(기록|체크|모니터링|체크리스트|지표)/.test(text)) return "monitoring";
  if (/(상품|가격|추천|구매)/.test(text)) return "product";
  if (/(식단|생활|운동|수면)/.test(text)) return "lifestyle";
  return "general";
}

function pickDiverseSuggestions(params: {
  candidates: string[];
  count: number;
  excludeSuggestions?: string[];
}) {
  const excludeKeys = new Set(
    (params.excludeSuggestions || []).map(normalizeSuggestionKey).filter(Boolean)
  );
  const selected: string[] = [];
  const selectedKeys = new Set<string>();
  const usedIntents = new Set<string>();

  const cleaned = params.candidates
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && line.length <= 90);

  for (const candidate of cleaned) {
    const key = normalizeSuggestionKey(candidate);
    if (!key || excludeKeys.has(key) || selectedKeys.has(key)) continue;
    const intent = classifySuggestionIntent(candidate);
    if (usedIntents.has(intent)) continue;
    selected.push(candidate);
    selectedKeys.add(key);
    usedIntents.add(intent);
    if (selected.length >= params.count) return selected;
  }

  for (const candidate of cleaned) {
    const key = normalizeSuggestionKey(candidate);
    if (!key || excludeKeys.has(key) || selectedKeys.has(key)) continue;
    selected.push(candidate);
    selectedKeys.add(key);
    if (selected.length >= params.count) return selected;
  }

  return selected;
}

export function buildDataDrivenSuggestions(
  summary: UserContextSummary,
  desiredCount = 2,
  excludeSuggestions: string[] = []
) {
  const count = clamp(desiredCount, 1, 6);
  const candidates: string[] = [];

  candidates.push(...buildJourneySegmentSuggestions(summary));

  if (summary.safetyEscalation.level === "escalate") {
    candidates.push(
      "약사 확인이 먼저 필요한 이유와 지금 꼭 확인해야 할 복용약·증상 정보를 3가지로 정리해줘.",
      "지금 단계에서 제품 추천보다 먼저 물어봐야 할 추가 정보 2가지를 짧게 정리해줘.",
      "내 상황에서 표현을 조심해야 하는 이유와 약사에게 바로 전달할 핵심 포인트를 정리해줘."
    );

    return pickDiverseSuggestions({
      candidates,
      count,
      excludeSuggestions,
    }).slice(0, count);
  }

  if (summary.safetyEscalation.level === "watch") {
    candidates.push(
      "지금 조심해서 봐야 하는 복용약·증상·생활 신호를 먼저 정리해줘.",
      "약사 확인 전까지는 어떤 기준으로 가볍게 시작하면 되는지 보수적으로 정리해줘."
    );
  }

  if (summary.consultationImpact.stage === "retention_ready") {
    candidates.push(summary.consultationImpact.draftPrompt);
    candidates.push(
      "지난 주문 기준으로 유지할 것과 바꿀 것만 나눠서, 재구매 전에 확인할 포인트를 짧게 정리해주세요."
    );
  }

  if (summary.consultationImpact.stage === "ready_to_buy") {
    candidates.push(summary.consultationImpact.draftPrompt);
    candidates.push(
      "지금 제 상황에서 바로 시작할 후보 1~2개만 남기고, 왜 그 둘이 맞는지 짧게 설명해주세요."
    );
  }

  if (summary.consultationImpact.stage === "stalled_in_consult") {
    candidates.push(summary.consultationImpact.draftPrompt);
    candidates.push(
      "질문을 넓히지 말고, 이번 주에 결정해야 할 구성 1개만 바로 정리해주세요."
    );
  }

  if (summary.consultationImpact.stage === "needs_narrowing") {
    candidates.push(summary.consultationImpact.draftPrompt);
  }

  if (summary.recommendedNutrients.length > 0) {
    for (const nutrient of summary.recommendedNutrients.slice(0, 2)) {
      candidates.push(
        `내 상태에서 ${nutrient} 기준으로 아침/저녁 복용 순서를 2주 계획으로 짜줘.`
      );
      candidates.push(
        `내 기준에서 ${nutrient} 관련해 지금 줄이거나 추가할 성분을 구분해줘.`
      );
    }
  }

  if (summary.healthLink) {
    const headline = summary.healthLink.headline || "건강링크 요약";
    candidates.push(
      `내 건강링크 요약(${headline}) 기준으로 이번 달에 먼저 점검할 생활 습관 2가지를 정리해줘.`
    );

    if (summary.healthLink.topMedicines.length > 0) {
      candidates.push(
        `내 건강링크 복약 이력(${summary.healthLink.topMedicines.join(
          ", "
        )}) 기준으로 영양제와 함께 볼 상호작용 주의 포인트를 정리해줘.`
      );
    }

    if (
      summary.healthLink.riskLevel === "high" ||
      summary.healthLink.riskLevel === "medium"
    ) {
      candidates.push(
        "내 건강링크 주의 신호 기준으로 약사에게 바로 확인할 질문 3가지를 정리해줘."
      );
    }
  }

  if (summary.notableResponses.length > 0) {
    const response = summary.notableResponses[0];
    candidates.push(
      `내가 답한 "${response.question}"(${response.answer})을 반영해서 이번 주 체크 포인트를 정리해줘.`
    );
  }

  if (summary.recentOrders.length > 0) {
    const firstOrder = summary.recentOrders[0];
    const firstItem = firstOrder.items[0];
    if (firstItem) {
      candidates.push(
        `내 최근 주문 상품(${firstItem}) 기준으로 중복 섭취나 과다 가능성을 먼저 점검해줘.`
      );
      candidates.push(
        "내 최근 주문 상품에 맞춰 부족한 영양소만 보완하는 조합을 제안해줘."
      );
    }
  }

  const firstGoal = summary.profile?.goals?.[0];
  if (firstGoal) {
    candidates.push(
      `내 ${firstGoal} 목표를 기준으로 14일 안에 실행할 복용·생활 루틴을 정리해줘.`
    );
  }

  const firstConstraint = summary.profile?.constraints?.[0];
  if (firstConstraint) {
    candidates.push(
      `내 ${firstConstraint} 조건에서 피해야 할 성분과 대체 성분을 나눠 정리해줘.`
    );
  }

  if (summary.previousConsultations.length > 0) {
    candidates.push(
      `내 지난 상담(${summary.previousConsultations[0].title}) 이후 지금 조정할 점 2가지를 찾아줘.`
    );
  }

  if (candidates.length === 0) {
    candidates.push(...buildDataCollectionQuestions());
  }

  candidates.push("내 데이터 기준으로 이번 주에 바로 실행할 2가지를 정리해줘.");

  const selected = pickDiverseSuggestions({
    candidates,
    count,
    excludeSuggestions,
  });
  if (selected.length >= count) return selected.slice(0, count);

  const fallback = buildDataCollectionQuestions();
  return pickDiverseSuggestions({
    candidates: selected.concat(fallback),
    count,
    excludeSuggestions,
  }).slice(0, count);
}
