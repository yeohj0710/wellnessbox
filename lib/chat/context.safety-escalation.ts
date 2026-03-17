import { uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

type SafetyEscalationInput = {
  profile: UserContextSummary["profile"];
  healthLink: UserContextSummary["healthLink"];
  notableResponses: UserContextSummary["notableResponses"];
  previousConsultations: UserContextSummary["previousConsultations"];
};

function buildConsultationSignals(
  previousConsultations: UserContextSummary["previousConsultations"]
) {
  const warningTerms = [
    "부작용",
    "출혈",
    "알레르기",
    "두근",
    "답답",
    "임신",
    "수유",
    "어지러",
    "불면",
    "악화",
  ];

  return previousConsultations
    .slice(0, 2)
    .flatMap((session) => {
      const merged = [session.title, session.userPoint, session.assistantPoint]
        .filter(Boolean)
        .join(" ");
      return warningTerms.filter((term) => merged.includes(term));
    })
    .filter(Boolean);
}

export function buildSafetyEscalationSummary(
  input: SafetyEscalationInput
): UserContextSummary["safetyEscalation"] {
  const reasons: string[] = [];
  const needsMoreInfo: string[] = [];
  const cautiousExpressionGuide: string[] = [];

  let score = 0;

  if (input.healthLink?.riskLevel === "high") {
    score += 3;
    reasons.push("건강링크에서 먼저 같이 봐두면 좋은 내용이 있어요.");
  } else if (input.healthLink?.riskLevel === "medium") {
    score += 2;
    reasons.push("건강링크에 적힌 내용까지 같이 보면 훨씬 편해지는 상태예요.");
  }

  if ((input.profile?.medications.length ?? 0) > 0) {
    score += 2;
    reasons.push(
      `복용 중인 약(${input.profile?.medications.slice(0, 2).join(", ")})이 있어 현재 복용 내용부터 맞춰 보는 편이 좋아요.`
    );
    needsMoreInfo.push("지금 먹고 있는 약 이름이나 복용 목적을 적어주면 훨씬 수월해져요.");
  }

  if ((input.healthLink?.topMedicines.length ?? 0) > 0) {
    score += 1;
    reasons.push("건강링크에 최근 복약 내용이 보여 지금 먹는 내용과 함께 보는 편이 좋아요.");
    needsMoreInfo.push("최근 자주 먹는 약이나 영양제가 있으면 같이 적어주세요.");
  }

  if ((input.profile?.conditions.length ?? 0) >= 2) {
    score += 2;
    reasons.push("현재 관리 중인 내용이 여러 가지라, 한 가지 목적만 보고 좁히지 않는 편이 좋아요.");
    needsMoreInfo.push("요즘 가장 신경 쓰는 상태 변화가 있으면 한두 가지만 적어주세요.");
  } else if ((input.profile?.conditions.length ?? 0) === 1) {
    score += 1;
    reasons.push("현재 관리 중인 상태가 있어 그 내용에 맞춰 보는 쪽이 더 자연스러워요.");
  }

  if ((input.profile?.allergies.length ?? 0) > 0) {
    score += 2;
    reasons.push("알레르기 정보가 있어 원료 쪽은 한 번 더 같이 보는 편이 좋아요.");
    needsMoreInfo.push("예민했던 성분이나 피하고 싶은 원료가 있으면 같이 적어주세요.");
  }

  if (input.profile?.constraints.includes("임신/수유")) {
    score += 3;
    reasons.push("임신·수유 관련 정보가 있으면 먼저 현재 상황부터 맞춰 보는 편이 좋아요.");
    needsMoreInfo.push("현재 임신·수유 중인지, 같이 참고할 상황이 있는지 알려주세요.");
  }

  if (input.profile?.constraints.includes("카페인 민감")) {
    score += 1;
    reasons.push("카페인에 예민한 편이면 먹는 시간대나 성분 구성을 조금 더 부드럽게 보는 게 좋아요.");
  }

  const cautionResponses = input.notableResponses.filter(
    (item) => item.signal === "주의"
  );
  if (cautionResponses.length >= 2) {
    score += 2;
    reasons.push("검사 답변에 먼저 짚고 넘어가면 좋은 내용이 몇 가지 보여요.");
    needsMoreInfo.push("불편했던 증상이나 특히 신경 쓰이는 점을 짧게 적어주면 도움이 돼요.");
  } else if (cautionResponses.length === 1) {
    score += 1;
    reasons.push(`"${cautionResponses[0].question}" 답변은 한 번 더 같이 보는 편이 좋아요.`);
  }

  const consultationSignals = buildConsultationSignals(input.previousConsultations);
  if (consultationSignals.length > 0) {
    score += 1;
    reasons.push(
      `이전 상담에서 ${uniq(consultationSignals, 2).join(", ")} 같은 내용이 보여 최근 흐름을 같이 보는 편이 좋아요.`
    );
  }

  cautiousExpressionGuide.push(
    "결과는 단정하지 않고 현재 보이는 흐름 중심으로 정리해요.",
    "복용 중인 약이나 불편한 증상이 있으면 그 내용부터 먼저 같이 봐요.",
    "모르는 정보가 있으면 비워두지 않고 어떤 점이 더 필요할지 함께 적어요."
  );

  if (input.healthLink?.riskLevel === "unknown" && !input.profile) {
    needsMoreInfo.push("복용약, 질환, 알레르기 중 해당되는 내용이 있으면 먼저 알려주세요.");
  }

  const level =
    score >= 5 ? "escalate" : score >= 2 ? "watch" : "routine";

  if (level === "escalate") {
    return {
      level,
      badgeLabel: "먼저 확인",
      headline: "지금은 현재 상태를 조금 더 먼저 확인해두는 편이 좋아요.",
      reasonLines: uniq(reasons, 4),
      needsMoreInfo: uniq(needsMoreInfo, 3),
      cautiousExpressionGuide: uniq(cautiousExpressionGuide, 3),
      requiresPharmacistReview: true,
    };
  }

  if (level === "watch") {
    return {
      level,
      badgeLabel: "같이 확인",
      headline: "몇 가지만 같이 보면 결과를 훨씬 편하게 읽을 수 있어요.",
      reasonLines: uniq(reasons, 4),
      needsMoreInfo: uniq(needsMoreInfo, 3),
      cautiousExpressionGuide: uniq(cautiousExpressionGuide, 3),
      requiresPharmacistReview: uniq(reasons, 4).length > 0,
    };
  }

  return {
    level,
    badgeLabel: "참고",
    headline: "지금은 큰 주의 신호보다 기본 흐름을 먼저 보면 되는 단계예요.",
    reasonLines: [
      "현재 보이는 정보 안에서는 먼저 크게 걸리는 내용이 많지 않아요.",
    ],
    needsMoreInfo: uniq(needsMoreInfo, 2),
    cautiousExpressionGuide: uniq(cautiousExpressionGuide, 3),
    requiresPharmacistReview: false,
  };
}
