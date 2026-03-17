import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";
import { governCopyModel } from "@/lib/copy-governance";
import {
  resolveSituationalContext,
  type SituationalContextModel,
} from "@/lib/situational-context/engine";

export type ValuePropositionSurface = "home" | "explore" | "check-ai" | "chat";

export type ValueActionTarget =
  | "chat"
  | "explore"
  | "trial"
  | "check-ai"
  | "assess"
  | "my-data";

export type PersonalizedValueProposition = {
  id:
    | "safety"
    | "decision"
    | "goal"
    | "restart"
    | "maintain"
    | "starter";
  badgeLabel: string;
  headline: string;
  description: string;
  helper: string;
  reasonLines: string[];
  primaryAction: {
    target: ValueActionTarget;
    label: string;
  };
  secondaryAction?: {
    target: ValueActionTarget;
    label: string;
  };
  chatPrompt: string;
  situationContext: SituationalContextModel;
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

function joinLabels(items: string[], limit = 2) {
  const picked = uniqueStrings(items, limit);
  return picked.join(", ");
}

function pickReasonLines(summary: UserContextSummary, extras: string[]) {
  return uniqueStrings(
    [
      ...extras,
      ...summary.explainability.fitReasons,
      ...summary.consultationImpact.evidence,
      ...summary.journeySegment.reasonLines,
    ].filter(Boolean),
    3
  );
}

function resolveSurfacePrimaryLabel(
  target: ValueActionTarget,
  surface: ValuePropositionSurface
) {
  if (target === "chat") {
    return surface === "chat" ? "이 기준으로 더 물어보기" : "약사와 같이 맞춰보기";
  }
  if (target === "trial") return "7일치로 가볍게 보기";
  if (target === "explore") return "지금 맞는 축부터 보기";
  if (target === "check-ai") return "빠른검사로 기준 만들기";
  if (target === "assess") return "정밀검사로 더 좁히기";
  return "내 데이터 기준으로 이어보기";
}

export function resolvePersonalizedValueProposition(input: {
  summary: UserContextSummary;
  surface: ValuePropositionSurface;
  matchedCategoryNames?: string[];
  preferredPackage?: "all" | "7" | "30";
}): PersonalizedValueProposition {
  const { summary, surface } = input;
  const signals = buildUserCapabilitySignals(summary);
  const situationContext = resolveSituationalContext({ summary });
  const pickContextualReasonLines = (extras: string[]) =>
    pickReasonLines(summary, [situationContext.reasonLines[0] ?? "", ...extras]);
  const withSituation = (
    model: Omit<PersonalizedValueProposition, "situationContext">
  ): PersonalizedValueProposition => ({
    ...governCopyModel(model),
    situationContext,
  });
  const matchedCategoryNames =
    input.matchedCategoryNames?.length
      ? uniqueStrings(input.matchedCategoryNames, 3)
      : uniqueStrings(summary.recommendedNutrients, 3);
  const matchedLabel = joinLabels(matchedCategoryNames, 2);
  const topGoal = summary.profile?.goals[0] ?? "";
  const safetyPoint =
    summary.explainability.pharmacistReviewPoints[0] ||
    summary.safetyEscalation.reasonLines[0] ||
    "";
  const fitPoint = summary.explainability.fitReasons[0] || "";
  const consultPoint =
    summary.consultationImpact.insight ||
    summary.consultationImpact.learnedPattern ||
    "";

  switch (summary.journeySegment.id) {
    case "safety_first_manager":
      return withSituation({
        id: "safety",
        badgeLabel: "안심이 먼저",
        headline:
          surface === "chat"
            ? "지금 대화에서 먼저 풀어야 할 가치는 안전하게 확인하는 근거예요"
            : "지금 설득력 있는 건 더 많은 추천보다 안심하고 시작할 이유예요",
        description:
          safetyPoint ||
          "복용약, 주의 신호, 건강 데이터 맥락이 있으면 무엇을 사는지보다 무엇을 먼저 확인하는지가 신뢰를 만듭니다.",
        helper:
          surface === "check-ai"
            ? "빠른검사 결과는 방향 참고용으로 보고, 병용 가능성과 주의 포인트는 약사와 같이 좁힐수록 더 안전합니다."
            : "과한 확신보다 조심해서 설명하고, 꼭 확인할 점을 먼저 짚어주는 흐름이 지금 더 잘 맞습니다.",
        reasonLines: pickContextualReasonLines([
          signals.healthRisk === "high" || signals.healthRisk === "medium"
            ? `건강링크 위험 신호가 ${signals.healthRisk} 단계예요.`
            : "",
          signals.medicationCount > 0
            ? `복용약 맥락이 ${signals.medicationCount}개 이상 잡혀 있어요.`
            : "",
          signals.conditionCount > 0
            ? `질환·주의 맥락이 ${signals.conditionCount}개 이상 있어요.`
            : "",
        ]),
        primaryAction: {
          target: "chat",
          label: resolveSurfacePrimaryLabel("chat", surface),
        },
        secondaryAction: {
          target: "trial",
          label: "가볍게 비교만 보기",
        },
        chatPrompt:
          "복용약, 주의 신호, 최근 결과를 기준으로 지금 먼저 조심할 점과 추가로 확인하면 좋은 정보 2가지만 정리해줘.",
      });

    case "guided_decider":
      return withSituation({
        id: "decision",
        badgeLabel: "결정 피로 줄이기",
        headline:
          surface === "chat"
            ? "지금 대화의 가치는 정보를 더 늘리는 것보다 후보를 좁혀주는 데 있어요"
            : "지금은 더 많은 설명보다 후보를 1~2개로 줄여주는 방식이 더 설득력 있어요",
        description:
          consultPoint ||
          "상담이 이미 있었는데 구매로 바로 이어지지 않았다면, 정보 추가보다 비교 기준을 줄여주는 편이 훨씬 움직이기 쉽습니다.",
        helper:
          matchedLabel
            ? `${matchedLabel} 쪽으로 보이지만, 왜 맞는지와 아직 모르는 점을 같이 보여줘야 결정을 덜 미룹니다.`
            : "왜 맞는지와 아직 모르는 점을 같이 보여줘야, 사용자가 스스로 결정을 미루지 않게 됩니다.",
        reasonLines: pickContextualReasonLines([
          summary.consultationImpact.headline,
          matchedLabel ? `지금은 ${matchedLabel} 쪽으로 후보가 모이고 있어요.` : "",
        ]),
        primaryAction: {
          target: "chat",
          label: surface === "chat" ? "후보 2개로 좁혀보기" : "후보를 같이 좁혀보기",
        },
        secondaryAction: {
          target: "explore",
          label: "맞는 축부터 비교하기",
        },
        chatPrompt:
          "지금까지의 상담과 결과를 바탕으로 후보를 1~2개로 좁히고, 각각 왜 맞는지와 아직 확인이 필요한 점을 같이 정리해줘.",
      });

    case "goal_driven_builder":
      return withSituation({
        id: "goal",
        badgeLabel: "목표부터 연결",
        headline:
          surface === "chat"
            ? "지금 대화는 목표와 맞는 축부터 선명하게 잡아주는 쪽이 더 가치 있어요"
            : "이 사용자가 더 잘 움직이는 이유는 상품보다 목표와 맞는 축이 먼저 보일 때예요",
        description:
          matchedLabel
            ? `${matchedLabel} 축부터 보면 막연히 둘러보는 시간보다 훨씬 빨리 “왜 이게 나와 맞는지”가 이해됩니다.`
            : "막연한 탐색보다 목표와 연결된 축부터 보여줘야, 같은 상품도 훨씬 설득력 있게 느껴집니다.",
        helper:
          topGoal
            ? `현재 목표가 ${topGoal}라면, 그 목표와 직접 이어지는 축부터 보여주는 것이 첫 구매 전환에 더 유리합니다.`
            : "목표와 결과를 먼저 연결해주면 가격이나 할인보다 이해와 공감이 먼저 생깁니다.",
        reasonLines: pickContextualReasonLines([
          topGoal ? `현재 등록된 목표는 ${topGoal}예요.` : "",
          matchedLabel ? `추천 축은 ${matchedLabel} 쪽이에요.` : "",
          fitPoint,
        ]),
        primaryAction: {
          target: surface === "check-ai" ? "explore" : "explore",
          label: resolveSurfacePrimaryLabel("explore", surface),
        },
        secondaryAction: {
          target:
            signals.hasQuick && !signals.hasAssess && surface !== "chat"
              ? "assess"
              : "trial",
          label:
            signals.hasQuick && !signals.hasAssess && surface !== "chat"
              ? "정밀하게 더 좁히기"
              : "7일치로 가볍게 시작",
        },
        chatPrompt:
          "내 목표와 최근 결과를 기준으로 먼저 봐야 할 축과, 왜 그 축이 지금 나에게 맞는지 이해하기 쉽게 정리해줘.",
      });

    case "drifting_returner":
      return withSituation({
        id: "restart",
        badgeLabel: "가볍게 재시작",
        headline:
          surface === "chat"
            ? "지금 대화의 가치는 예전 구성을 반복하는 것보다 다시 붙기 쉬운 시작안을 찾는 데 있어요"
            : "이 사용자는 예전 강도를 반복하기보다 부담 없이 다시 붙는 제안이 더 설득력 있어요",
        description:
          "한 번 쉬었다 다시 오는 사용자는 더 강한 제안보다 “이번엔 가볍게 다시 시작해도 된다”는 해석에 더 반응합니다.",
        helper:
          input.preferredPackage === "7"
            ? "재시작 장벽을 낮추려면 7일치처럼 부담이 낮은 경로를 먼저 보여주는 편이 자연스럽습니다."
            : "예전 흐름을 바로 복원하되, 강도는 낮추고 다시 붙기 쉬운 경로를 먼저 보여주는 것이 좋습니다.",
        reasonLines: pickContextualReasonLines([
          summary.journeySegment.reasonLines[0] || "",
          matchedLabel ? `이번엔 ${matchedLabel} 중심으로 가볍게 다시 볼 수 있어요.` : "",
        ]),
        primaryAction: {
          target: "trial",
          label: "7일치로 다시 붙기",
        },
        secondaryAction: {
          target: "chat",
          label: "예전 구성에서 바꿀 점 묻기",
        },
        chatPrompt:
          "예전 흐름을 그대로 반복하지 않고, 지금 다시 시작하기 쉬운 구성과 바꿔볼 점 1~2개만 가볍게 정리해줘.",
      });

    case "steady_maintainer":
      return withSituation({
        id: "maintain",
        badgeLabel: "체감과 유지",
        headline:
          surface === "chat"
            ? "지금 대화의 가치는 새 상품 추가보다 유지·조정 포인트를 또렷하게 만드는 데 있어요"
            : "이 사용자는 새 추천보다 지금 흐름을 더 좋아지게 하는 해석이 더 설득력 있어요",
        description:
          "이미 이어온 흐름이 있으면 새 구성을 늘리는 것보다 체감, 리필, 미세 조정을 설명해주는 편이 신뢰와 재구매에 더 잘 붙습니다.",
        helper:
          "무엇을 더 살지보다 무엇을 유지하고 어디를 조정할지 짧게 보여주면, 다시 들어오고 다시 묻게 되는 이유가 생깁니다.",
        reasonLines: pickContextualReasonLines([
          summary.consultationImpact.headline,
          signals.hasOrders ? `최근 주문 흐름이 ${signals.orderCount}건 이상 이어져 있어요.` : "",
        ]),
        primaryAction: {
          target: "my-data",
          label: resolveSurfacePrimaryLabel("my-data", surface),
        },
        secondaryAction: {
          target: "chat",
          label: "조정 포인트 같이 보기",
        },
        chatPrompt:
          "최근 주문과 상담 흐름을 기준으로 계속 유지할 점과 조정하면 좋은 포인트를 1~2개만 짧게 정리해줘.",
      });

    default:
      if (surface === "check-ai") {
        return withSituation({
          id: "starter",
          badgeLabel: "기준이 생겼어요",
          headline: "이제는 결과를 이해하기 쉬운 상품 흐름으로 바로 연결해주는 것이 더 설득력 있어요",
          description:
            matchedLabel
              ? `${matchedLabel} 쪽 결과가 보이기 시작했기 때문에, 막연한 탐색보다 이 축부터 비교해보는 편이 훨씬 쉽습니다.`
              : "첫 기준이 생겼기 때문에, 막연한 탐색보다 결과와 이어진 흐름으로 바로 들어가는 편이 훨씬 쉽습니다.",
          helper:
            "빠른검사는 방향을 잡아주는 역할이고, 더 세밀한 판단이 필요하면 정밀검사나 상담으로 이어가면 됩니다.",
          reasonLines: pickContextualReasonLines([
            matchedLabel ? `현재는 ${matchedLabel} 방향 가능성이 먼저 보여요.` : "",
            fitPoint,
          ]),
          primaryAction: {
            target: "explore",
            label: "이 결과로 상품 보기",
          },
          secondaryAction: {
            target: "assess",
            label: "정밀검사로 더 좁히기",
          },
          chatPrompt:
            "빠른검사 결과를 바탕으로 먼저 볼 축과, 정밀검사나 상담이 더 필요한지 이해하기 쉽게 정리해줘.",
        });
      }

      return withSituation({
        id: "starter",
        badgeLabel: "기준 먼저",
        headline:
          surface === "chat"
            ? "지금 대화의 가치는 상품 추천보다 먼저 내 기준을 또렷하게 만드는 데 있어요"
            : "처음엔 할인보다도 “나한테 맞는 기준이 생겼다”는 감각이 더 설득력 있어요",
        description:
          "아직 데이터가 많지 않은 사용자는 복잡한 추천보다 빠르게 기준을 만들고 그 기준으로 탐색하는 흐름에서 더 잘 움직입니다.",
        helper:
          "무엇을 살지 바로 정하기보다, 목표와 현재 고민을 먼저 좁혀주면 이후 탐색과 상담이 훨씬 편해집니다.",
        reasonLines: pickContextualReasonLines([
          topGoal ? `현재 목표는 ${topGoal}예요.` : "",
          signals.hasResults ? "이미 일부 결과가 있어 다음 단계로 이어가기 좋아요." : "",
        ]),
        primaryAction: {
          target: "check-ai",
          label: resolveSurfacePrimaryLabel("check-ai", surface),
        },
        secondaryAction: {
          target: "explore",
          label: "입문용부터 가볍게 보기",
        },
        chatPrompt:
          "처음 시작하는 기준으로 내 목표와 생활 고민을 짧게 정리하고, 무엇부터 보면 좋은지 이해하기 쉽게 설명해줘.",
      });
  }
}
