import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";

export type SharedCareSurface = "my-data";

export type SharedCareAction = {
  label: string;
  href: string;
};

export type SharedCareModel = {
  tone: "slate" | "sky" | "emerald" | "amber";
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  promptActions: Array<{
    label: string;
    prompt: string;
  }>;
  primaryAction: SharedCareAction;
  secondaryAction?: SharedCareAction;
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

function buildChatHref(from: string, draft: string) {
  const query = new URLSearchParams();
  query.set("from", from);
  query.set("draft", draft);
  return `/chat?${query.toString()}`;
}

export function resolveSharedCareModel(input: {
  summary: UserContextSummary;
  surface: SharedCareSurface;
}): SharedCareModel {
  const { summary } = input;
  const signals = buildUserCapabilitySignals(summary);
  const recommendedLabel = uniqueStrings(summary.recommendedNutrients, 2).join(", ");
  const fitReason = summary.explainability.fitReasons[0] || "";
  const pharmacistPoint =
    summary.explainability.pharmacistReviewPoints[0] ||
    summary.safetyEscalation.reasonLines[0] ||
    "";

  if (signals.isSafetySensitive) {
    const primaryPrompt =
      "부모님이나 가족 대신 확인하려고 해요. 지금 기록과 복용약 맥락을 기준으로 먼저 조심할 점과 약사 확인이 필요한 이유를 쉽게 정리해줘.";
    return {
      tone: "amber",
      badgeLabel: "보호자/가족 대신 확인",
      title: "가족 대신 묻는 상황이라면 추천보다 병용·주의 확인을 먼저 붙이는 편이 더 안전해요",
      description:
        pharmacistPoint ||
        "부모님이나 가족을 대신 챙길 때는 무엇을 더 살지보다, 지금 함께 봐야 할 약·질환·주의 신호를 먼저 정리해주는 흐름이 더 믿을 만합니다.",
      helper:
        "상담에 바로 현재 복용약, 건강링크, 검사 기록을 묶어 보여주면 보호자도 더 적은 질문으로 핵심만 확인할 수 있어요.",
      reasonLines: uniqueStrings(
        [
          signals.medicationCount > 0
            ? `복용약 맥락이 ${signals.medicationCount}개 이상 잡혀 있어요.`
            : "",
          signals.conditionCount > 0
            ? `질환·주의 맥락이 ${signals.conditionCount}개 이상 있어요.`
            : "",
          signals.healthRisk === "high" || signals.healthRisk === "medium"
            ? `건강링크 위험 신호가 ${signals.healthRisk} 단계예요.`
            : "",
          pharmacistPoint,
        ].filter(Boolean),
        3
      ),
      promptActions: [
        {
          label: "부모님 대신 묻기",
          prompt: primaryPrompt,
        },
        {
          label: "같이 먹어도 되는지 확인",
          prompt:
            "가족이 지금 먹는 약이나 영양제와 같이 봐도 되는지, 꼭 먼저 확인할 점 2가지만 짧게 정리해줘.",
        },
      ],
      primaryAction: {
        label: "가족 대신 상담 열기",
        href: buildChatHref("/my-data", primaryPrompt),
      },
      secondaryAction: {
        label: "건강링크 다시 보기",
        href: "/health-link",
      },
    };
  }

  if (signals.hasResults || signals.hasOrders) {
    const primaryPrompt =
      "내 기록을 가족이나 연인과 같이 보려고 해요. 지금 상태를 어렵지 않게 설명하고, 함께 보면 좋은 다음 행동 1~2개만 정리해줘.";
    return {
      tone: "sky",
      badgeLabel: "함께 설명하고 관리",
      title: "내 기록을 가족·연인과 함께 볼 때 핵심만 쉽게 풀어주는 흐름이 있으면 훨씬 자연스러워져요",
      description:
        recommendedLabel
          ? `${recommendedLabel} 같은 현재 축을 혼자 이해하는 데서 끝내지 않고, 같이 보는 사람도 바로 납득할 수 있게 풀어주면 상담과 구매가 함께 쉬워집니다.`
          : "검사나 주문 기록이 쌓인 상태에서는 혼자만 이해하는 설명보다, 같이 보는 사람도 바로 납득할 수 있는 설명이 더 큰 확장성을 만듭니다.",
      helper:
        "커플이 같이 시작하거나 보호자가 대신 챙길 때는 긴 설명보다 현재 상태, 주의점, 다음 행동을 짧게 묶어주는 편이 더 실용적이에요.",
      reasonLines: uniqueStrings(
        [
          fitReason,
          summary.consultationImpact.evidence[0] || "",
          signals.hasOrders ? `최근 주문 흐름이 ${signals.orderCount}건 이상 있어요.` : "",
          signals.hasResults ? "검사 결과가 있어 설명의 근거가 비교적 선명해요." : "",
        ].filter(Boolean),
        3
      ),
      promptActions: [
        {
          label: "가족에게 쉽게 설명",
          prompt: primaryPrompt,
        },
        {
          label: "커플 같이 시작하기",
          prompt:
            "연인이나 배우자와 같이 시작한다고 가정하고, 서로 겹치지 않게 가볍게 보기 좋은 입문 흐름을 정리해줘.",
        },
        {
          label: "보호자용 핵심만 보기",
          prompt:
            "보호자가 대신 볼 때 꼭 알아야 할 핵심 상태와 다음 행동만 짧게 정리해줘.",
        },
      ],
      primaryAction: {
        label: "같이 볼 설명 만들기",
        href: buildChatHref("/my-data", primaryPrompt),
      },
      secondaryAction: {
        label: "맞는 상품 같이 보기",
        href: "/explore#home-products",
      },
    };
  }

  const starterPrompt =
    "가족이나 연인과 같이 시작한다고 가정하고, 서로 부담 없이 보기 좋은 입문 흐름과 먼저 확인할 점을 정리해줘.";
  return {
    tone: "emerald",
    badgeLabel: "가족/커플 함께 시작",
    title: "함께 시작하는 상황이라면 과한 추천보다 서로 부담 없이 붙을 수 있는 입문 흐름이 더 잘 맞아요",
    description:
      "가족, 연인, 부모-자녀처럼 생활 단위로 쓰기 시작할 때는 각자 완벽히 맞추는 것보다도 서로 겹치지 않고 가볍게 시작할 이유를 만드는 편이 훨씬 자연스럽습니다.",
    helper:
      "7일치처럼 부담이 낮은 경로와 함께, 누구를 대신 보고 있는지까지 상담에 바로 적어 보내면 처음 이용하는 장벽이 많이 줄어들어요.",
    reasonLines: uniqueStrings(
      [
        summary.journeySegment.reasonLines[0] || "",
        recommendedLabel ? `현재는 ${recommendedLabel} 쪽 축이 먼저 보여요.` : "",
        "아직 가족 단위 관리 기록이 없어도, 함께 시작하는 질문부터 자연스럽게 열 수 있어요.",
      ].filter(Boolean),
      3
    ),
    promptActions: [
      {
        label: "커플 입문 흐름 묻기",
        prompt: starterPrompt,
      },
      {
        label: "부모님 선물 전 점검",
        prompt:
          "부모님께 가볍게 권하거나 선물하기 전에 꼭 먼저 확인해야 할 점과 부담 없는 시작안을 정리해줘.",
      },
    ],
    primaryAction: {
      label: "가볍게 함께 시작하기",
      href: "/explore?package=7#home-products",
    },
    secondaryAction: {
      label: "가족용 상담 초안 열기",
      href: buildChatHref("/my-data", starterPrompt),
    },
  };
}
