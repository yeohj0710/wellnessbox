import { uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

type ExplainabilityInput = {
  profile: UserContextSummary["profile"];
  recentOrders: UserContextSummary["recentOrders"];
  latestAssess: UserContextSummary["latestAssess"];
  latestQuick: UserContextSummary["latestQuick"];
  healthLink: UserContextSummary["healthLink"];
  previousConsultations: UserContextSummary["previousConsultations"];
  recommendedNutrients: UserContextSummary["recommendedNutrients"];
  notableResponses: UserContextSummary["notableResponses"];
  missingData: string[];
};

function joinTop(items: string[], limit = 2) {
  return items.filter(Boolean).slice(0, limit).join(", ");
}

function buildConfidence(input: ExplainabilityInput) {
  let sourceCount = 0;
  if (input.profile) sourceCount += 1;
  if (input.recentOrders.length > 0) sourceCount += 1;
  if (input.latestAssess) sourceCount += 2;
  if (input.latestQuick) sourceCount += 1;
  if (input.healthLink) sourceCount += 2;
  if (input.previousConsultations.length > 0) sourceCount += 1;
  if (input.notableResponses.length > 0) sourceCount += 1;

  if (sourceCount >= 6) {
    return {
      label: "근거가 비교적 충분해요",
      note: "검사, 기록, 최근 흐름을 같이 보면서 정리했어요.",
    };
  }

  if (sourceCount >= 3) {
    return {
      label: "몇 가지 기록을 함께 봤어요",
      note: "한 가지 답변만 본 건 아니고, 최근에 남아 있는 기록을 같이 참고했어요.",
    };
  }

  return {
    label: "가볍게 먼저 보는 단계예요",
    note: "지금 입력된 내용부터 먼저 정리한 결과예요. 답변이 더 쌓이면 방향이 조금 달라질 수 있어요.",
  };
}

export function buildExplainabilitySummary(input: ExplainabilityInput) {
  const fitReasons: string[] = [];
  const uncertaintyNotes: string[] = [];
  const pharmacistReviewPoints: string[] = [];

  if (input.notableResponses.length > 0) {
    const firstSignal = input.notableResponses[0];
    fitReasons.push(
      `${firstSignal.source}에서 "${firstSignal.question}"에 "${firstSignal.answer}"라고 답한 점을 같이 봤어요.`
    );
  }

  if (input.recommendedNutrients.length > 0) {
    fitReasons.push(
      `검사 결과에서는 ${joinTop(input.recommendedNutrients)} 쪽이 먼저 보였어요.`
    );
  }

  if (input.healthLink?.headline || input.healthLink?.highlights.length) {
    fitReasons.push(
      `건강링크에서도 ${input.healthLink.headline || input.healthLink.highlights[0]} 같은 흐름이 보여 함께 참고했어요.`
    );
  }

  if (input.recentOrders.length > 0) {
    fitReasons.push(
      "최근 선택했던 내용도 같이 보면서 너무 동떨어진 결과가 나오지 않게 맞췄어요."
    );
  }

  if (input.previousConsultations.length > 0) {
    const latestChat = input.previousConsultations[0];
    const chatPoint = latestChat.userPoint || latestChat.assistantPoint;
    if (chatPoint) {
      fitReasons.push(`이전 상담에서 나왔던 "${chatPoint}" 내용도 같이 참고했어요.`);
    }
  }

  if (input.missingData.length > 0) {
    uncertaintyNotes.push(
      `${input.missingData.slice(0, 2).join(", ")} 정보가 없어 지금은 넓게 보면서 정리하고 있어요.`
    );
  }

  if (!input.healthLink) {
    uncertaintyNotes.push(
      "건강링크 정보가 없으면 최근 검사와 설문 응답 중심으로 먼저 보게 돼요."
    );
  }

  if (!input.latestAssess && !input.latestQuick) {
    uncertaintyNotes.push(
      "최근 검사 기록이 없으면 생활 변화나 복용 상황까지는 아직 충분히 반영되지 않을 수 있어요."
    );
  }

  if (
    input.healthLink &&
    (input.healthLink.riskLevel === "high" ||
      input.healthLink.riskLevel === "medium")
  ) {
    pharmacistReviewPoints.push(
      "건강링크에서 같이 보면 좋을 내용이 있어, 새로 더하기 전에 한 번 더 짚어보는 편이 좋아요."
    );
  }

  if (
    (input.profile?.medications.length ?? 0) > 0 ||
    (input.healthLink?.topMedicines.length ?? 0) > 0
  ) {
    pharmacistReviewPoints.push(
      "복용 중인 약이 있으면 새로운 성분을 더할 때 현재 복용 내용부터 같이 보는 편이 편해요."
    );
  }

  if (input.notableResponses.some((item) => item.signal === "주의")) {
    pharmacistReviewPoints.push(
      "검사 답변 중에 먼저 짚고 넘어가면 좋은 내용이 있어, 그 부분부터 같이 보면 훨씬 정확해져요."
    );
  }

  const confidence = buildConfidence(input);

  return {
    confidenceLabel: confidence.label,
    confidenceNote: confidence.note,
    fitReasons: uniq(fitReasons, 4),
    uncertaintyNotes: uniq(uncertaintyNotes, 3),
    pharmacistReviewPoints: uniq(pharmacistReviewPoints, 3),
  };
}
