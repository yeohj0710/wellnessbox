import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";

type ThemeKey =
  | "effect_timing"
  | "delivery_response"
  | "side_effect"
  | "intake_burden"
  | "trust_fit"
  | "repurchase";

type ThemeDefinition = {
  label: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  actionHint: string;
};

type ProductAggregate = {
  name: string;
  orderCount: number;
  reviewCount: number;
  highRateCount: number;
  lowRateCount: number;
  ratingTotal: number;
  repeatBuyerCount: number;
};

export type PharmFeedbackMiningSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
  satisfactionDrivers: string[];
  frictionDrivers: string[];
  actionItems: string[];
  watchItems: Array<{
    label: string;
    detail: string;
    tone: "good" | "warn";
  }>;
};

const THEME_DEFINITIONS: Record<ThemeKey, ThemeDefinition> = {
  effect_timing: {
    label: "체감 시점/기대 관리",
    positiveKeywords: ["효과", "체감", "도움", "좋아", "만족", "개선"],
    negativeKeywords: ["효과없", "체감없", "모르겠", "애매", "잘모르", "변화없"],
    actionHint: "복용 후 언제 어떤 변화를 기대하면 좋은지 초기에 더 분명하게 안내하기",
  },
  delivery_response: {
    label: "응답/배송 커뮤니케이션",
    positiveKeywords: ["친절", "빠르", "응대", "설명", "안내", "정리"],
    negativeKeywords: ["배송", "늦", "지연", "답변", "응답", "문의", "취소", "환불", "누락"],
    actionHint: "첫 응답과 배송/수령 안내 템플릿을 더 앞쪽에서 보내 재문의를 줄이기",
  },
  side_effect: {
    label: "복용 후 불편/주의",
    positiveKeywords: ["편안", "부담없", "괜찮", "무난"],
    negativeKeywords: ["속", "메스꺼", "불편", "두통", "어지", "안맞", "부담"],
    actionHint: "복용 전 주의 포인트와 약사 에스컬레이션 기준을 더 먼저 노출하기",
  },
  intake_burden: {
    label: "복용 편의성",
    positiveKeywords: ["간편", "편하", "소분", "챙기기", "먹기좋", "부담없"],
    negativeKeywords: ["크", "냄새", "맛", "비린", "목넘김", "번거"],
    actionHint: "소분/복용 편의 장점을 더 강조하고 부담 큰 구성은 시작 강도를 낮추기",
  },
  trust_fit: {
    label: "맞춤 신뢰/설명력",
    positiveKeywords: ["맞춤", "딱맞", "추천", "상담", "안심", "설명"],
    negativeKeywords: ["왜", "중복", "과한", "모르겠", "설명부족", "안맞"],
    actionHint: "추천 이유와 왜 이 구성이 맞는지 설명하는 문구를 더 분명하게 남기기",
  },
  repurchase: {
    label: "재구매 의향",
    positiveKeywords: ["재구매", "또살", "다시주문", "계속", "꾸준", "재주문"],
    negativeKeywords: ["그만", "중단", "안살", "끊", "취소"],
    actionHint: "만족 포인트가 확인된 구성은 리필/반복구매 진입을 더 쉽게 연결하기",
  },
};

function compactText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function uniqueLines(lines: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function classifyTheme(text: string, polarity: "positive" | "negative") {
  const normalized = compactText(text);
  if (!normalized) return [] as ThemeKey[];

  return (Object.entries(THEME_DEFINITIONS) as Array<[ThemeKey, ThemeDefinition]>)
    .filter(([, theme]) =>
      (polarity === "positive" ? theme.positiveKeywords : theme.negativeKeywords).some(
        (keyword) => normalized.includes(keyword)
      )
    )
    .map(([key]) => key);
}

function customerMessages(order: OrderAccordionOrder) {
  return (order.messagesPreview || []).filter(
    (message) => typeof message.pharmacyId !== "number"
  );
}

function getCustomerIdentity(order: OrderAccordionOrder) {
  return (order.phone || "").replace(/\D/g, "") || `order:${order.id}`;
}

function buildThemeCounts() {
  return new Map<ThemeKey, number>(
    (Object.keys(THEME_DEFINITIONS) as ThemeKey[]).map((key) => [key, 0])
  );
}

function incrementThemes(counts: Map<ThemeKey, number>, keys: ThemeKey[]) {
  for (const key of keys) {
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}

function topThemes(counts: Map<ThemeKey, number>, limit: number) {
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count, theme: THEME_DEFINITIONS[key] }));
}

function averageRate(aggregate: ProductAggregate) {
  if (aggregate.reviewCount === 0) return 0;
  return aggregate.ratingTotal / aggregate.reviewCount;
}

export function buildPharmFeedbackMiningSummary(
  orders: OrderAccordionOrder[]
): PharmFeedbackMiningSummary | null {
  if (orders.length === 0) return null;

  const positiveThemeCounts = buildThemeCounts();
  const negativeThemeCounts = buildThemeCounts();
  const productAggregates = new Map<string, ProductAggregate>();
  const productBuyerHistory = new Map<string, Set<string>>();

  let reviewCount = 0;
  let highReviewCount = 0;
  let lowReviewCount = 0;
  let cancellationCount = 0;
  let issueMessageCount = 0;

  for (const order of orders) {
    if (order.status === ORDER_STATUS.CANCELED) {
      cancellationCount += 1;
      incrementThemes(negativeThemeCounts, ["delivery_response", "repurchase"]);
    }

    for (const message of customerMessages(order)) {
      const matched = classifyTheme(message.content, "negative");
      if (matched.length > 0) {
        issueMessageCount += 1;
        incrementThemes(negativeThemeCounts, matched);
      }
    }

    const buyerId = getCustomerIdentity(order);

    for (const item of order.orderItems) {
      const productName = item.pharmacyProduct?.product?.name?.trim() || "상품";
      const aggregate =
        productAggregates.get(productName) ||
        ({
          name: productName,
          orderCount: 0,
          reviewCount: 0,
          highRateCount: 0,
          lowRateCount: 0,
          ratingTotal: 0,
          repeatBuyerCount: 0,
        } satisfies ProductAggregate);

      aggregate.orderCount += 1;
      productAggregates.set(productName, aggregate);

      const buyerSet =
        productBuyerHistory.get(productName) || new Set<string>();
      const beforeSize = buyerSet.size;
      buyerSet.add(buyerId);
      productBuyerHistory.set(productName, buyerSet);
      if (buyerSet.size > 1 && beforeSize !== buyerSet.size) {
        aggregate.repeatBuyerCount = buyerSet.size;
      }

      const review = item.review;
      if (!review || typeof review.rate !== "number") continue;

      reviewCount += 1;
      aggregate.reviewCount += 1;
      aggregate.ratingTotal += review.rate;

      if (review.rate >= 4.5) {
        highReviewCount += 1;
        aggregate.highRateCount += 1;
        incrementThemes(
          positiveThemeCounts,
          classifyTheme(review.content || "", "positive")
        );
      } else if (review.rate <= 3) {
        lowReviewCount += 1;
        aggregate.lowRateCount += 1;
        const lowThemes: ThemeKey[] = [
          ...classifyTheme(review.content || "", "negative"),
          ...(review.content ? [] : (["effect_timing"] as ThemeKey[])),
        ];
        incrementThemes(
          negativeThemeCounts,
          Array.from(new Set(lowThemes))
        );
      } else {
        incrementThemes(
          positiveThemeCounts,
          classifyTheme(review.content || "", "positive")
        );
      }
    }
  }

  const topPositive = topThemes(positiveThemeCounts, 3);
  const topNegative = topThemes(negativeThemeCounts, 3);
  const repeatedProducts = [...productAggregates.values()]
    .filter((product) => product.repeatBuyerCount >= 2)
    .sort(
      (left, right) =>
        right.repeatBuyerCount - left.repeatBuyerCount ||
        right.highRateCount - left.highRateCount
    );
  const riskyProducts = [...productAggregates.values()]
    .filter(
      (product) =>
        product.lowRateCount > 0 ||
        (product.reviewCount >= 2 && averageRate(product) < 4)
    )
    .sort(
      (left, right) =>
        right.lowRateCount - left.lowRateCount ||
        averageRate(left) - averageRate(right)
    );

  const leadingNegative = topNegative[0];
  const leadingPositive = topPositive[0];

  const headline = leadingNegative
    ? `${leadingNegative.theme.label}이 최근 불만과 이탈 신호의 중심으로 보여요.`
    : leadingPositive
    ? `${leadingPositive.theme.label}이 만족과 재구매를 만드는 포인트로 읽혀요.`
    : "최근 피드백에서 제품과 운영의 개선 포인트를 함께 읽고 있어요.";

  const summaryParts = [
    reviewCount > 0 ? `리뷰 ${reviewCount}건` : "",
    lowReviewCount > 0 ? `저평점 ${lowReviewCount}건` : "",
    repeatedProducts.length > 0 ? `반복 구매 신호 ${repeatedProducts.length}개 상품` : "",
    cancellationCount > 0 ? `취소 ${cancellationCount}건` : "",
    issueMessageCount > 0 ? `문의 신호 ${issueMessageCount}건` : "",
  ].filter(Boolean);

  const satisfactionDrivers = uniqueLines(
    [
      ...topPositive.map(
        (entry) =>
          `${entry.theme.label}: ${entry.count}건에서 만족 신호가 반복돼요.`
      ),
      repeatedProducts[0]
        ? `${repeatedProducts[0].name}: 같은 고객이 다시 고른 흐름이 ${repeatedProducts[0].repeatBuyerCount}회 보였어요.`
        : "",
      highReviewCount > 0
        ? `고평점 리뷰 ${highReviewCount}건이 있어 잘 먹히는 포인트를 계속 살릴 수 있어요.`
        : "",
    ],
    3
  );

  const frictionDrivers = uniqueLines(
    [
      ...topNegative.map(
        (entry) =>
          `${entry.theme.label}: ${entry.count}건에서 불만/이탈 신호가 보여요.`
      ),
      cancellationCount > 0
        ? `주문 취소 ${cancellationCount}건이 있어 응답/기대 관리 흐름을 다시 볼 필요가 있어요.`
        : "",
      riskyProducts[0]
        ? `${riskyProducts[0].name}: 저평점 또는 낮은 평균 평점이 반복돼 점검이 필요해요.`
        : "",
    ],
    3
  );

  const actionItems = uniqueLines(
    [
      leadingNegative ? leadingNegative.theme.actionHint : "",
      repeatedProducts[0]
        ? `${repeatedProducts[0].name}처럼 재구매가 붙는 상품은 복용 설명과 진입 문구를 다른 상품에도 이식해볼 만해요.`
        : "",
      lowReviewCount > 0 && !leadingNegative
        ? "저평점 리뷰 본문이 짧아도, 첫 복용 기대치와 복약 설명을 더 먼저 주는 편이 안전해요."
        : "",
      issueMessageCount > 0
        ? "고객 메시지에서 반복되는 질문을 템플릿으로 먼저 답하면 운영 시간이 줄어들어요."
        : "",
    ],
    3
  );

  const watchItems: PharmFeedbackMiningSummary["watchItems"] = uniqueLines(
    [
      repeatedProducts[0]
        ? `good::${repeatedProducts[0].name}::재구매 신호 ${repeatedProducts[0].repeatBuyerCount}회`
        : "",
      repeatedProducts[1]
        ? `good::${repeatedProducts[1].name}::반복 선택이 이어지는 흐름`
        : "",
      riskyProducts[0]
        ? `warn::${riskyProducts[0].name}::저평점 ${riskyProducts[0].lowRateCount}건 또는 평균 ${averageRate(riskyProducts[0]).toFixed(1)}점`
        : "",
      riskyProducts[1]
        ? `warn::${riskyProducts[1].name}::설명/구성 점검이 필요한 신호`
        : "",
    ],
    4
  ).map((item) => {
    const [tone, label, detail] = item.split("::");
    return {
      tone: tone === "warn" ? ("warn" as const) : ("good" as const),
      label: label || "상품",
      detail: detail || "",
    };
  });

  return {
    headline,
    summary: summaryParts.join(" · ") || "최근 주문 기준 피드백 데이터가 아직 적어요.",
    statBadges: uniqueLines(
      [
        `고평점 ${highReviewCount}건`,
        `저평점 ${lowReviewCount}건`,
        `재구매 신호 ${repeatedProducts.length}개 상품`,
        `취소 ${cancellationCount}건`,
      ],
      4
    ),
    satisfactionDrivers:
      satisfactionDrivers.length > 0
        ? satisfactionDrivers
        : ["아직 만족 신호가 충분히 쌓이지 않았어요."],
    frictionDrivers:
      frictionDrivers.length > 0
        ? frictionDrivers
        : ["아직 뚜렷한 불만 신호는 적지만, 문의 흐름은 계속 확인하는 편이 좋아요."],
    actionItems:
      actionItems.length > 0
        ? actionItems
        : ["리뷰와 문의가 더 쌓이면 제품/운영 개선 포인트가 더 선명해져요."],
    watchItems,
  };
}
