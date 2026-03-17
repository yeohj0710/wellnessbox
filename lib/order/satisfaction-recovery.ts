import { ORDER_STATUS, type OrderStatus } from "./orderStatus";

type RecoveryOrderItem = {
  quantity?: number | null;
  pharmacyProduct?: {
    optionType?: string | null;
    product?: {
      name?: string | null;
      categories?: Array<{ name?: string | null } | null> | null;
    } | null;
  } | null;
  review?: {
    rate?: number | null;
    content?: string | null;
  } | null;
};

type RecoveryOrder = {
  id: number;
  status?: OrderStatus | string | null;
  orderItems?: RecoveryOrderItem[] | null;
};

type RecoveryMessage = {
  pharmacyId?: number | null;
  content?: string | null;
};

type DissatisfactionType =
  | "side_effect_or_discomfort"
  | "delivery_or_configuration"
  | "usage_confusion"
  | "effect_gap"
  | "expectation_mismatch"
  | "general_disappointment";

export type SatisfactionRecoveryModel = {
  tone: "amber" | "sky";
  badge: string;
  title: string;
  summary: string;
  issueTypeLabel: string;
  whyLines: string[];
  recoveryLines: string[];
  helper: string;
  actionLabel: string;
  messageDraft: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function hasKeyword(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function getPrimaryItem(order: RecoveryOrder, itemIndex = 0) {
  return order.orderItems?.[itemIndex] || order.orderItems?.[0] || null;
}

function getProductName(order: RecoveryOrder, itemIndex = 0) {
  return (
    normalizeText(
      getPrimaryItem(order, itemIndex)?.pharmacyProduct?.product?.name
    ) || "이 상품"
  );
}

function getOptionType(order: RecoveryOrder, itemIndex = 0) {
  return (
    normalizeText(getPrimaryItem(order, itemIndex)?.pharmacyProduct?.optionType) ||
    "현재 옵션"
  );
}

function getPrimaryCategories(order: RecoveryOrder, itemIndex = 0) {
  return uniqueStrings(
    (
      getPrimaryItem(order, itemIndex)?.pharmacyProduct?.product?.categories || []
    )
      .map((category) => normalizeText(category?.name))
      .filter(Boolean),
    2
  );
}

function normalizeStatus(value: OrderStatus | string | null | undefined): OrderStatus {
  if (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  ) {
    return value as OrderStatus;
  }
  return ORDER_STATUS.PAYMENT_COMPLETE;
}

function classifyDissatisfaction(input: {
  text: string;
  rate: number | null;
}): DissatisfactionType | null {
  const text = normalizeKey(input.text);
  const rate = input.rate;

  const sideEffectPatterns = [
    /속.?불편/,
    /메스껍/,
    /두근/,
    /어지/,
    /두통/,
    /설사/,
    /변비/,
    /트러블/,
    /알레르기/,
    /부작용/,
    /불면/,
    /잠.?안/,
    /가려/,
  ];
  if (hasKeyword(text, sideEffectPatterns)) {
    return "side_effect_or_discomfort";
  }

  const deliveryPatterns = [
    /배송/,
    /늦/,
    /누락/,
    /빠졌/,
    /다르/,
    /오배송/,
    /파손/,
    /박스/,
    /포장/,
    /옵션/,
    /수량/,
  ];
  if (hasKeyword(text, deliveryPatterns)) {
    return "delivery_or_configuration";
  }

  const usagePatterns = [
    /언제/,
    /어떻게/,
    /식전/,
    /식후/,
    /아침/,
    /저녁/,
    /같이/,
    /간격/,
    /복용/,
    /헷갈/,
    /순서/,
  ];
  if (hasKeyword(text, usagePatterns)) {
    return "usage_confusion";
  }

  const effectPatterns = [
    /효과/,
    /체감/,
    /변화.?없/,
    /잘.?모르겠/,
    /모르겠/,
    /도움.?안/,
    /별로/,
    /차이.?없/,
  ];
  if (hasKeyword(text, effectPatterns)) {
    return "effect_gap";
  }

  const expectationPatterns = [
    /기대/,
    /생각보다/,
    /예상보다/,
    /과장/,
    /다를/,
    /실망/,
  ];
  if (hasKeyword(text, expectationPatterns)) {
    return "expectation_mismatch";
  }

  if (typeof rate === "number" && rate <= 3.5) {
    return "general_disappointment";
  }

  return null;
}

function buildMessageDraft(input: {
  type: DissatisfactionType;
  productName: string;
  optionType: string;
  note: string;
}) {
  const note = normalizeText(input.note);

  if (input.type === "side_effect_or_discomfort") {
    return `${input.productName} (${input.optionType}) 복용 후 불편했던 점이 있어요.${note ? ` ${note}` : ""} 지금은 무엇을 먼저 중단하거나 확인해야 하는지와 약사 확인이 필요한 포인트를 짧게 안내 부탁드려요.`;
  }

  if (input.type === "delivery_or_configuration") {
    return `${input.productName} (${input.optionType}) 관련해서 배송/구성 경험이 기대와 달랐어요.${note ? ` ${note}` : ""} 지금 어떤 확인이나 조치가 가능한지 먼저 알려주세요.`;
  }

  if (input.type === "usage_confusion") {
    return `${input.productName} (${input.optionType})를 어떻게 시작해야 할지 아직 헷갈려요.${note ? ` ${note}` : ""} 복용 시간, 순서, 같이 보면 좋은 점만 짧게 정리 부탁드려요.`;
  }

  if (input.type === "effect_gap") {
    return `${input.productName} (${input.optionType})를 시작했는데 기대한 체감이 아직 잘 안 잡혀요.${note ? ` ${note}` : ""} 지금 시점에 무엇을 점검하면 좋을지와 무리 없는 다음 행동을 짧게 안내 부탁드려요.`;
  }

  if (input.type === "expectation_mismatch") {
    return `${input.productName} (${input.optionType}) 경험이 기대했던 것과 조금 달랐어요.${note ? ` ${note}` : ""} 어떤 기대를 조정해서 보는 게 맞는지와 지금 확인할 점을 짧게 알려주세요.`;
  }

  return `${input.productName} (${input.optionType}) 사용 경험이 기대와 조금 달랐어요.${note ? ` ${note}` : ""} 지금 가장 먼저 확인하면 좋을 점 1~2개만 짧게 안내 부탁드려요.`;
}

function buildModel(input: {
  type: DissatisfactionType;
  order: RecoveryOrder;
  note: string;
  surface: "review" | "order";
  itemIndex?: number;
}): SatisfactionRecoveryModel {
  const productName = getProductName(input.order, input.itemIndex);
  const optionType = getOptionType(input.order, input.itemIndex);
  const categories = getPrimaryCategories(input.order, input.itemIndex);
  const note = normalizeText(input.note);
  const categoryLine = categories.length > 0 ? categories.join(", ") : "현재 구성";

  if (input.type === "side_effect_or_discomfort") {
    return {
      tone: "amber",
      badge: "불편·주의 반응",
      title: "불편하거나 예민한 반응이 있었다면, 리뷰보다 먼저 안전하게 상황을 정리하는 편이 좋아요.",
      summary:
        "이 경우에는 만족/불만 평가보다 무엇이 언제 불편했는지 좁혀서 남기는 편이 더 실질적인 도움으로 이어져요.",
      issueTypeLabel: "불편감/주의 신호",
      whyLines: uniqueStrings(
        [
          "속 불편, 두근거림, 수면 변화, 피부 반응처럼 몸이 불편했던 경험은 단순 만족도보다 안전 확인이 먼저예요.",
          categories.length > 0
            ? `${categoryLine} 목적이라도 불편 반응이 있으면 같은 방식으로 계속 밀기보다 원인을 먼저 좁히는 편이 안전해요.`
            : "",
        ],
        3
      ),
      recoveryLines: uniqueStrings(
        [
          "무엇을 더 하라는 제안보다, 언제 어떤 불편이 있었는지 1~2개로 짧게 남기면 약사 검토가 훨씬 빨라져요.",
          "지금은 혼자 계속 시도해 보기보다 주문 메시지로 현재 반응을 먼저 설명하는 편이 좋아요.",
        ],
        3
      ),
      helper:
        input.surface === "review"
          ? "리뷰는 그대로 남겨도 되지만, 먼저 설명을 남기면 대응과 안내가 더 정확해질 수 있어요."
          : "후기보다 먼저 현재 반응을 설명하면 같은 실망이 반복되는 걸 줄이기 쉬워요.",
      actionLabel: "약국에 먼저 설명 남기기",
      messageDraft: buildMessageDraft({
        type: input.type,
        productName,
        optionType,
        note,
      }),
    };
  }

  if (input.type === "delivery_or_configuration") {
    return {
      tone: "amber",
      badge: "구성·배송 이슈",
      title: "실망의 이유가 효과보다 배송·구성 문제라면, 그 지점을 바로 짚는 편이 회복이 빨라요.",
      summary:
        "옵션, 수량, 누락, 포장 같은 문제는 감정만 남기기보다 무엇이 달랐는지 짧게 명확히 남길수록 해결이 쉬워져요.",
      issueTypeLabel: "배송/구성 문제",
      whyLines: uniqueStrings(
        [
          `${productName} (${optionType}) 경험이 꼬였더라도 원인이 배송·구성 문제면 복용 자체 문제와 분리해서 보는 편이 좋아요.`,
          "무엇이 빠졌는지, 무엇이 달랐는지 한 줄로 남기면 불필요한 반복 설명이 줄어요.",
        ],
        3
      ),
      recoveryLines: uniqueStrings(
        [
          "‘별로였다’보다 실제로 달랐던 점을 먼저 남기면 조정이나 확인이 훨씬 빨라져요.",
          "후기 전에 주문 메시지로 구성 문제를 먼저 남기면 같은 실망이 장기 불신으로 번지는 걸 줄일 수 있어요.",
        ],
        3
      ),
      helper:
        "불만을 참는 것보다, 구성 문제를 먼저 분리해 설명하는 편이 훨씬 실용적이에요.",
      actionLabel: "구성 문제 설명 남기기",
      messageDraft: buildMessageDraft({
        type: input.type,
        productName,
        optionType,
        note,
      }),
    };
  }

  if (input.type === "usage_confusion") {
    return {
      tone: "sky",
      badge: "복용 혼란",
      title: "실망의 핵심이 ‘안 맞는다’보다 ‘어떻게 써야 할지 헷갈렸다’라면, 그걸 먼저 풀어야 해요.",
      summary:
        "복용 시간, 순서, 같이 먹는 방법이 unclear하면 체감 부족이나 만족도 저하로 바로 느껴질 수 있어요.",
      issueTypeLabel: "복용 혼란",
      whyLines: uniqueStrings(
        [
          `${productName} (${optionType})를 시작하는 장면이 헷갈리면 실제 만족도보다 먼저 혼란이 커져요.`,
          categories.length > 0
            ? `${categoryLine} 목적은 특히 시작 순서와 루틴이 정리돼야 덜 실망스럽게 느껴질 수 있어요.`
            : "",
        ],
        3
      ),
      recoveryLines: uniqueStrings(
        [
          "‘언제, 얼마나, 무엇과 같이’ 중 헷갈린 것 1~2개만 남기면 답변이 훨씬 짧고 실용적으로 와요.",
          "후기를 쓰기 전에 시작 규칙부터 정리하면 불필요한 실망을 줄이기 쉬워요.",
        ],
        3
      ),
      helper:
        "사용법 혼란은 만족도 문제처럼 보여도, 실제론 짧은 안내 하나로 풀리는 경우가 많아요.",
      actionLabel: "복용법 먼저 물어보기",
      messageDraft: buildMessageDraft({
        type: input.type,
        productName,
        optionType,
        note,
      }),
    };
  }

  if (input.type === "effect_gap") {
    return {
      tone: "sky",
      badge: "체감 부족",
      title: "효과가 약하게 느껴졌다면, ‘안 맞았다’로 바로 끝내기보다 기대와 체크 포인트를 좁혀보는 편이 좋아요.",
      summary:
        "체감 부족은 실제 미스매치일 수도 있지만, 초반 기대치가 너무 높거나 체크 포인트가 넓어서 그렇게 느껴질 수도 있어요.",
      issueTypeLabel: "체감 부족",
      whyLines: uniqueStrings(
        [
          `${productName} (${optionType})는 한 번에 크게 느끼려 하기보다 어떤 포인트를 보고 있는지 좁혀야 실망이 덜 커져요.`,
          "기대와 다른 경험이 있었다면 무엇이 부족했는지 한두 문장으로 좁히는 게 다음 조정에 더 도움이 돼요.",
        ],
        3
      ),
      recoveryLines: uniqueStrings(
        [
          "‘효과 없음’보다 어떤 점이 기대와 달랐는지 짧게 남기면 다음 조정이나 설명이 훨씬 구체적이에요.",
          "무리하게 계속 사기보다, 지금 단계에서 점검할 포인트를 먼저 받아보는 편이 신뢰를 지키기 쉬워요.",
        ],
        3
      ),
      helper:
        "체감 부족은 막연히 달래기보다, 무엇이 부족했는지 구조화해 남길 때 회복 경험으로 바뀌기 쉬워요.",
      actionLabel: "체감 부족 이유 남기기",
      messageDraft: buildMessageDraft({
        type: input.type,
        productName,
        optionType,
        note,
      }),
    };
  }

  if (input.type === "expectation_mismatch") {
    return {
      tone: "sky",
      badge: "기대와 다른 경험",
      title: "실망의 핵심이 기대와 실제 경험의 간격이라면, 그 간격을 짧게 설명하는 편이 회복에 더 좋아요.",
      summary:
        "좋고 나쁨만 남기기보다 ‘무엇을 기대했는데 무엇이 달랐는지’를 남기면 훨씬 덜 소모적으로 풀 수 있어요.",
      issueTypeLabel: "기대 불일치",
      whyLines: uniqueStrings(
        [
          "실망은 보통 결과보다 기대와 실제 경험이 어긋날 때 커져요.",
          `${productName} (${optionType})에서 무엇이 기대와 달랐는지 짧게 남기면 다음 설명이나 조정이 쉬워져요.`,
        ],
        3
      ),
      recoveryLines: uniqueStrings(
        [
          "막연한 불만보다 기대와 실제 차이를 먼저 남기면 같은 오해가 반복되는 걸 줄이기 쉬워요.",
          "바로 재구매/이탈 판단을 하기보다 현재 간격을 먼저 설명받는 편이 더 실용적일 수 있어요.",
        ],
        3
      ),
      helper:
        "이 경우에는 설득보다 해석을 맞추는 게 더 중요해요.",
      actionLabel: "기대와 다른 점 남기기",
      messageDraft: buildMessageDraft({
        type: input.type,
        productName,
        optionType,
        note,
      }),
    };
  }

  return {
    tone: "sky",
    badge: "낮은 만족 회복",
    title: "실망을 그냥 남기기보다, 이유를 한 단계만 더 좁히면 회복 경험으로 바꾸기 쉬워요.",
    summary:
      "좋지 않았던 경험 자체는 중요하지만, 왜 그랬는지를 짧게 구조화해서 남길수록 대응이 훨씬 좋아져요.",
    issueTypeLabel: "일반 실망",
    whyLines: uniqueStrings(
      [
        "무엇이 별로였는지 한두 가지로 좁히면 같은 불만이 반복되는 걸 줄이기 쉬워요.",
        `${productName} (${optionType})에서 아쉬웠던 점을 먼저 설명하면 단순 위로보다 실제 다음 행동으로 이어지기 쉬워요.`,
      ],
      3
    ),
    recoveryLines: uniqueStrings(
      [
        "막연한 낮은 만족도보다 이유를 먼저 남기면 회복 속도가 훨씬 빨라져요.",
        "리뷰와 별개로 주문 메시지에 먼저 설명을 남기면 후속 대응이 더 실용적으로 붙을 수 있어요.",
      ],
      3
    ),
    helper:
      "실망을 줄이는 가장 쉬운 방법은 감정만 남기지 않고 이유를 짧게 구조화하는 거예요.",
    actionLabel: "아쉬웠던 점 설명 남기기",
    messageDraft: buildMessageDraft({
      type: input.type,
      productName,
      optionType,
      note,
    }),
  };
}

export function buildSatisfactionRecoveryFromReviewDraft(input: {
  order: RecoveryOrder;
  itemIndex: number;
  rate: number | null;
  content: string;
}) {
  const type = classifyDissatisfaction({
    text: input.content,
    rate: input.rate,
  });

  if (!type) return null;

  return buildModel({
    type,
    order: input.order,
    note: input.content,
    surface: "review",
    itemIndex: input.itemIndex,
  });
}

export function buildSatisfactionRecoveryFromOrder(input: {
  order: RecoveryOrder;
  messages: RecoveryMessage[];
}) {
  const status = normalizeStatus(input.order.status);
  if (status !== ORDER_STATUS.DELIVERY_COMPLETE) return null;

  const lowReview = (input.order.orderItems || []).find((item) => {
    const rate = item.review?.rate;
    return typeof rate === "number" && rate <= 3.5;
  });

  const customerNegativeMessage = [...input.messages]
    .reverse()
    .find((message) => {
      if (message.pharmacyId != null) return false;
      const type = classifyDissatisfaction({
        text: message.content || "",
        rate: null,
      });
      return Boolean(type);
    });

  const reviewType = lowReview
    ? classifyDissatisfaction({
        text: lowReview.review?.content || "",
        rate: lowReview.review?.rate ?? null,
      }) || "general_disappointment"
    : null;

  const messageType = customerNegativeMessage
    ? classifyDissatisfaction({
        text: customerNegativeMessage.content || "",
        rate: null,
      })
    : null;

  const type = reviewType || messageType;
  if (!type) return null;

  return buildModel({
    type,
    order: input.order,
    note:
      normalizeText(lowReview?.review?.content) ||
      normalizeText(customerNegativeMessage?.content) ||
      "",
    surface: "order",
    itemIndex: lowReview
      ? Math.max(
          0,
          (input.order.orderItems || []).findIndex((item) => item === lowReview)
        )
      : 0,
  });
}
