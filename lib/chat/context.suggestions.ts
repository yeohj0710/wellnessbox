import { clamp, uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

function buildDataCollectionQuestions() {
  return [
    "제 복용 영양제·약 기준으로 중복 성분부터 점검해 주세요.",
    "제 목표 1개 기준으로 2주 복용 루틴을 짜주세요.",
    "제 최근 불편 증상 기준으로 이번 주 체크리스트를 정리해 주세요.",
  ];
}

function normalizeSuggestionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

function classifySuggestionIntent(value: string) {
  const text = value.replace(/\s+/g, "");
  if (/(루틴|스케줄|복용시간|타이밍|아침|저녁|순서)/.test(text)) return "schedule";
  if (/(중복|과다|상호작용|주의|피해야|안전|점검)/.test(text)) return "safety";
  if (/(점검|체크|기록|모니터링|체크리스트|지표)/.test(text)) return "monitoring";
  if (/(제품|가격|추천|구매|상품)/.test(text)) return "product";
  if (/(식단|생활|습관|운동|수면)/.test(text)) return "lifestyle";
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

  if (summary.recommendedNutrients.length > 0) {
    for (const nutrient of summary.recommendedNutrients.slice(0, 2)) {
      candidates.push(
        `제 상태에서 ${nutrient} 기준으로 아침/저녁 복용 순서를 2주 계획으로 짜주세요.`
      );
      candidates.push(
        `제 기준에서 ${nutrient} 관련해 지금 줄이거나 추가할 성분을 구분해 주세요.`
      );
    }
  }

  if (summary.notableResponses.length) {
    for (const response of summary.notableResponses.slice(0, 1)) {
      candidates.push(
        `제가 답한 "${response.question}"(${response.answer})을 반영해 이번 주 점검표를 만들어 주세요.`
      );
    }
  }

  if (summary.recentOrders.length) {
    const firstOrder = summary.recentOrders[0];
    const firstItem = firstOrder.items[0];
    if (firstItem) {
      candidates.push(
        `제 최근 주문 제품(${firstItem}) 기준으로 중복·과다 가능성만 먼저 점검해 주세요.`
      );
      candidates.push(
        "제 최근 주문 제품을 유지하면서 부족한 영양소만 보완하는 조합을 짜주세요."
      );
    }
  }

  if (summary.profile?.goals.length) {
    const goal = summary.profile.goals[0];
    candidates.push(
      `제 ${goal} 목표를 14일 안에 점검할 수 있는 복용·생활 루틴을 정리해 주세요.`
    );
  }

  if (summary.profile?.constraints.length) {
    const constraint = summary.profile.constraints[0];
    candidates.push(
      `제 ${constraint} 조건에서 피해야 할 성분과 대체 성분을 표로 정리해 주세요.`
    );
  }

  if (summary.previousConsultations.length) {
    const recent = summary.previousConsultations[0];
    candidates.push(
      `제 지난 상담(${recent.title}) 이후 지금 가장 먼저 조정할 2가지를 뽑아 주세요.`
    );
  }

  if (candidates.length === 0) {
    candidates.push(...buildDataCollectionQuestions());
  }

  candidates.push("제 데이터 기준으로 이번 주에 바로 실행할 2가지를 정리해 주세요.");

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
