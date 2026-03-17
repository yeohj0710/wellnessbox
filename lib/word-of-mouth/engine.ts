import { buildUserCapabilitySignals } from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";

type ShareTone = "slate" | "sky" | "emerald" | "amber";

type ReviewOrderInput = {
  orderItems?: Array<{
    pharmacyProduct?: {
      optionType?: string | null;
      product?: {
        name?: string | null;
        categories?: Array<{ name?: string | null }> | null;
      } | null;
    } | null;
  }> | null;
};

export type WordOfMouthShareModel = {
  tone: ShareTone;
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  audienceLabel: string;
  reasonLines: string[];
  shareTitle: string;
  shareText: string;
  sharePath: string;
  primaryActionLabel: string;
  secondaryAction?: {
    href: string;
    label: string;
  };
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsKeyword(text: string, keywords: string[]) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function resolveConcernLabel(texts: string[]) {
  const text = texts.join(" ");

  if (containsKeyword(text, ["수면", "잠", "불면", "피로", "야근"])) {
    return "수면과 회복";
  }

  if (containsKeyword(text, ["스트레스", "긴장", "불안", "예민"])) {
    return "스트레스와 컨디션";
  }

  if (containsKeyword(text, ["혈당", "식사", "공복", "체중"])) {
    return "식사와 생활 리듬";
  }

  if (containsKeyword(text, ["면역", "감기", "회복", "활력"])) {
    return "활력과 회복";
  }

  return "요즘 컨디션";
}

function resolveReviewItemSnapshot(order: ReviewOrderInput, itemIndex: number) {
  const item = order.orderItems?.[itemIndex];
  const productName = item?.pharmacyProduct?.product?.name?.trim() ?? "";
  const optionType = item?.pharmacyProduct?.optionType?.trim() ?? "";
  const categories = uniqueStrings(
    (item?.pharmacyProduct?.product?.categories ?? [])
      .map((category) => category?.name?.trim() ?? "")
      .filter(Boolean),
    3
  );

  return {
    productName,
    optionType,
    categories,
  };
}

export function buildReviewWordOfMouthModel(input: {
  order: ReviewOrderInput;
  itemIndex: number;
  rate: number | null;
  content: string;
}): WordOfMouthShareModel | null {
  if (typeof input.rate !== "number" || input.rate < 4) return null;

  const item = resolveReviewItemSnapshot(input.order, input.itemIndex);
  const concernLabel = resolveConcernLabel([
    item.productName,
    item.optionType,
    ...item.categories,
    input.content,
  ]);
  const productLabel = item.productName || "이 구성";

  return {
    tone: "emerald",
    badgeLabel: "좋은 경험 이어주기",
    title: "이 만족은 할인 코드보다 짧은 한 줄 소개로 더 자연스럽게 퍼집니다",
    description: `${productLabel} 후기를 남길 정도로 괜찮았다면, 비슷한 고민이 있는 친구에게는 제품명보다 “어떤 고민에서 덜 헷갈렸는지”를 건네는 편이 부담이 적습니다.`,
    helper:
      "세게 권하기보다 빠른검사나 가벼운 시작 경로를 같이 보내면 소개받는 사람도 압박 없이 들어올 수 있어요.",
    audienceLabel: `비슷한 ${concernLabel} 고민이 있는 친구`,
    reasonLines: uniqueStrings(
      [
        `현재 평점이 ${input.rate.toFixed(1)}점이라 만족 경험이 분명하게 잡혀 있어요.`,
        item.categories[0]
          ? `${item.categories[0]} 맥락으로 설명하면 상품명보다 더 쉽게 공감됩니다.`
          : "",
        input.content.trim()
          ? "후기 내용을 길게 복사하기보다 왜 괜찮았는지 한 줄로 요약해 보내는 편이 더 자연스럽습니다."
          : "후기와 함께 짧은 추천 이유를 붙이면 지인 유입이 광고처럼 느껴지지 않습니다.",
      ],
      3
    ),
    shareTitle: "비슷한 고민 있으면 이 흐름부터 한 번 봐봐",
    shareText: `나도 ${concernLabel} 쪽이 애매해서 이것저것 바로 사기보다 여기서 먼저 흐름을 잡아봤어. 비슷하면 빠른검사부터 가볍게 해봐.`,
    sharePath: "/check-ai?from=review-share",
    primaryActionLabel: "지인에게 공유하기",
    secondaryAction: {
      href: "/explore?package=7#home-products",
      label: "가볍게 시작 경로 같이 보기",
    },
  };
}

export function buildMyDataWordOfMouthModel(input: {
  summary: UserContextSummary;
}): WordOfMouthShareModel | null {
  const { summary } = input;
  if (!summary.hasAnyData) return null;

  const signals = buildUserCapabilitySignals(summary);
  const focusLabel =
    summary.profile?.goals[0] ||
    summary.recommendedNutrients[0] ||
    summary.latestAssess?.findings[0] ||
    summary.latestQuick?.findings[0] ||
    "지금 컨디션";

  if (signals.isSafetySensitive) {
    return {
      tone: "amber",
      badgeLabel: "조심스럽게 소개하기",
      title: "안전이 먼저인 맥락에서는 제품보다 확인 경로를 공유하는 편이 신뢰를 지킵니다",
      description:
        "복용약이나 주의 신호가 보이는 경우에는 추천 상품을 보내기보다, 먼저 빠르게 점검하고 약사 확인까지 이어지는 경로를 건네는 편이 자연스럽습니다.",
      helper:
        "지인에게도 부담 없는 이유는 명확합니다. 무엇을 사라고 권하는 대신 먼저 확인하라고 말하는 흐름이기 때문입니다.",
      audienceLabel: "복용 중인 약이 있거나 조심스러운 가족",
      reasonLines: uniqueStrings(
        [
          summary.safetyEscalation.reasonLines[0] || "",
          summary.explainability.pharmacistReviewPoints[0] || "",
          "안전 민감 맥락에서는 공격적인 추천보다 점검 경로 공유가 장기 신뢰에 더 유리합니다.",
        ],
        3
      ),
      shareTitle: "복용 중인 게 있으면 이 흐름부터 확인해봐",
      shareText:
        "이건 뭘 사라는 얘기보다 먼저 확인해보면 좋은 흐름이야. 복용 중인 약 있거나 조심스러운 점 있으면 빠른검사부터 하고 필요하면 약사랑 같이 보는 쪽이 덜 불안하더라.",
      sharePath: "/check-ai?from=safety-share",
      primaryActionLabel: "가족에게 조심스럽게 공유하기",
      secondaryAction: {
        href: "/my-data#my-data-shared-care",
        label: "가족용 문구 더 다듬기",
      },
    };
  }

  if (
    summary.journeySegment.id === "goal_driven_builder" ||
    summary.journeySegment.id === "guided_decider"
  ) {
    return {
      tone: "sky",
      badgeLabel: "지인 유입 흐름",
      title: "내가 납득한 이유를 한 줄로 바꾸면 지인도 덜 망설이고 들어옵니다",
      description: `${focusLabel}처럼 목적이 분명한 맥락에서는 “나한테 왜 맞았는지”를 짧게 건네고 빠른검사나 탐색으로 이어 주는 흐름이 가장 부담이 적습니다.`,
      helper:
        "세게 권하는 문장보다, 먼저 방향을 잡아보라고 권하는 문장이 공유와 유입 모두에서 더 자연스럽습니다.",
      audienceLabel: "비슷한 고민을 가진 친구",
      reasonLines: uniqueStrings(
        [
          summary.explainability.fitReasons[0] || "",
          summary.consultationImpact.evidence[0] || "",
          `${summary.journeySegment.label} 단계에서는 내가 이해한 포인트를 짧게 전하는 방식이 가장 설득력 있습니다.`,
        ],
        3
      ),
      shareTitle: "비슷한 고민 있으면 이 흐름부터 가볍게 봐봐",
      shareText: `나도 ${focusLabel} 쪽이 애매했는데, 이것저것 바로 사기보다 여기서 먼저 방향을 잡아보니까 덜 헷갈렸어. 비슷하면 빠른검사부터 가볍게 해봐.`,
      sharePath: "/check-ai?from=my-data-share",
      primaryActionLabel: "친구에게 소개하기",
      secondaryAction: {
        href: "/explore?package=7#home-products",
        label: "입문 경로 같이 보기",
      },
    };
  }

  return {
    tone: "emerald",
    badgeLabel: "자연스러운 추천",
    title: "좋았던 경험은 제품 링크보다 시작하기 쉬운 경로로 건네야 오래 남습니다",
    description:
      "이미 주문이나 결과가 쌓였다면, 지인에게는 내가 샀던 것을 그대로 권하기보다 가볍게 시작할 수 있는 흐름을 같이 보내는 편이 훨씬 자연스럽습니다.",
    helper:
      "입문형 공유는 상대의 부담을 낮추고, 나중에 다시 이야기 이어가기도 쉬워서 장기적으로 더 강한 입소문이 됩니다.",
    audienceLabel: "가볍게 시작해보고 싶은 지인",
    reasonLines: uniqueStrings(
      [
        summary.journeySegment.reasonLines[0] || "",
        summary.consultationImpact.headline || "",
        signals.hasOrders
          ? `최근 주문과 관리 흐름이 있어 경험 기반 소개 문구를 만들기 좋은 상태예요.`
          : "아직은 가볍게 시작하는 흐름이 가장 부담 없이 소개됩니다.",
      ],
      3
    ),
    shareTitle: "부담 없이 시작해보려면 이쪽부터 봐봐",
    shareText:
      "나도 처음엔 뭘 골라야 할지 애매했는데, 여기서 가볍게 시작할 흐름부터 보니까 부담이 덜했어. 비슷하면 이 경로부터 한 번 봐봐.",
    sharePath: "/explore?package=7#home-products",
    primaryActionLabel: "가볍게 소개하기",
    secondaryAction: {
      href: "/my-data#my-data-shared-care",
      label: "가족/커플용 흐름 같이 보기",
    },
  };
}
