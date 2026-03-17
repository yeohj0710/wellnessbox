import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder, OrderMessage } from "@/components/order/orderAccordion.types";

type RootCauseKey =
  | "expectation_gap"
  | "explanation_gap"
  | "intake_burden"
  | "safety_friction"
  | "ops_reliability";

type RootCauseDefinition = {
  label: string;
  serviceArea: string;
  keywords: string[];
  preventionAction: string;
  fallbackSignal?: string;
};

type RootCauseAggregate = {
  key: RootCauseKey;
  label: string;
  serviceArea: string;
  preventionAction: string;
  totalSignals: number;
  cancelSignals: number;
  reviewSignals: number;
  inquirySignals: number;
  repeatInquirySignals: number;
  products: Map<string, number>;
  sampleLines: string[];
};

export type PharmRootCauseSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
  rootCauses: Array<{
    key: RootCauseKey;
    label: string;
    serviceArea: string;
    summary: string;
    preventionAction: string;
    statLine: string;
    products: string[];
    sampleLines: string[];
  }>;
  structuralActions: string[];
};

const ROOT_CAUSE_DEFINITIONS: Record<RootCauseKey, RootCauseDefinition> = {
  expectation_gap: {
    label: "효과 기대 시점 불일치",
    serviceArea: "결과 설명 / 초기 기대관리",
    keywords: [
      "효과",
      "체감",
      "변화없",
      "잘모르",
      "모르겠",
      "별로",
      "언제",
      "느낌없",
      "차이없",
    ],
    preventionAction:
      "첫 복용 전에 언제 무엇을 기대하면 되는지와 초기에 체감이 약할 수 있는 축을 먼저 짚어 주세요.",
    fallbackSignal: "낮은 후기 본문이 약하면 기대 시점 설명 부족으로 먼저 보고 점검해 보세요.",
  },
  explanation_gap: {
    label: "구성 이유·맞춤 설명 부족",
    serviceArea: "추천 이유 / 상담 설명",
    keywords: [
      "왜",
      "이유",
      "설명",
      "추천",
      "맞",
      "중복",
      "겹",
      "과한",
      "필요",
    ],
    preventionAction:
      "왜 이 조합인지, 내 경우 무엇부터 보는지, 겹칠 수 있는 축이 없는지를 1~2문장으로 먼저 설명해 주세요.",
  },
  intake_burden: {
    label: "복용 부담·시작 강도 과함",
    serviceArea: "구성 강도 / 복용 안내",
    keywords: [
      "많",
      "부담",
      "번거",
      "먹기힘",
      "알약",
      "목넘김",
      "귀찮",
      "힘들",
      "복잡",
    ],
    preventionAction:
      "복용 개수를 줄여 시작하거나 시간대를 묶는 방식으로 첫 주 부담을 낮추는 설명을 기본으로 붙이세요.",
  },
  safety_friction: {
    label: "복용 불편·안전 우려",
    serviceArea: "주의 안내 / 약사 에스컬레이션",
    keywords: [
      "메스",
      "속",
      "불편",
      "두통",
      "어지",
      "가슴",
      "부작용",
      "걱정",
      "불안",
    ],
    preventionAction:
      "불편 표현이 보이면 상품 설명보다 현재 복용약·질환·불편 시점을 먼저 확인하고 약사 검토를 앞에 두세요.",
  },
  ops_reliability: {
    label: "응답·배송·처리 신뢰 저하",
    serviceArea: "운영 커뮤니케이션 / 주문 진행",
    keywords: [
      "배송",
      "답변",
      "응답",
      "연락",
      "지연",
      "늦",
      "문의",
      "취소",
      "환불",
    ],
    preventionAction:
      "첫 응답, 배송/수령 안내, 요청사항 확인을 더 앞당기고 같은 질문이 반복되기 전에 템플릿으로 선제 안내해 주세요.",
    fallbackSignal: "취소나 반복 문의는 운영 신뢰 저하 신호로 먼저 묶어 보는 편이 좋아요.",
  },
};

function compactText(value: string | null | undefined, max = 84) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
}

function normalizeForMatch(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function uniqueLines(lines: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const normalized = compactText(line, 160);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function getCustomerMessages(order: OrderAccordionOrder) {
  return (order.messagesPreview || []).filter(
    (message) => typeof message.pharmacyId !== "number"
  );
}

function hasRepeatInquiry(order: OrderAccordionOrder, customerMessages: OrderMessage[]) {
  if (customerMessages.length >= 2) return true;
  if ((order.messageCount ?? 0) >= 4 && customerMessages.length > 0) return true;
  return false;
}

function getProductNames(order: OrderAccordionOrder) {
  return uniqueLines(
    order.orderItems.map((item) => item.pharmacyProduct?.product?.name || "상품"),
    3
  );
}

function createAggregate(key: RootCauseKey): RootCauseAggregate {
  const definition = ROOT_CAUSE_DEFINITIONS[key];
  return {
    key,
    label: definition.label,
    serviceArea: definition.serviceArea,
    preventionAction: definition.preventionAction,
    totalSignals: 0,
    cancelSignals: 0,
    reviewSignals: 0,
    inquirySignals: 0,
    repeatInquirySignals: 0,
    products: new Map<string, number>(),
    sampleLines: [],
  };
}

function classifyText(text: string) {
  const normalized = normalizeForMatch(text);
  if (!normalized) return [] as RootCauseKey[];

  return (Object.entries(ROOT_CAUSE_DEFINITIONS) as Array<
    [RootCauseKey, RootCauseDefinition]
  >)
    .filter(([, definition]) =>
      definition.keywords.some((keyword) => normalized.includes(keyword))
    )
    .map(([key]) => key);
}

function pushSignal(input: {
  aggregates: Map<RootCauseKey, RootCauseAggregate>;
  key: RootCauseKey;
  source: "cancel" | "review" | "inquiry" | "repeat_inquiry";
  line: string;
  products: string[];
}) {
  const aggregate = input.aggregates.get(input.key) || createAggregate(input.key);

  aggregate.totalSignals += 1;
  if (input.source === "cancel") aggregate.cancelSignals += 1;
  if (input.source === "review") aggregate.reviewSignals += 1;
  if (input.source === "inquiry") aggregate.inquirySignals += 1;
  if (input.source === "repeat_inquiry") aggregate.repeatInquirySignals += 1;

  for (const product of input.products) {
    aggregate.products.set(product, (aggregate.products.get(product) || 0) + 1);
  }
  if (input.line) {
    aggregate.sampleLines.push(input.line);
  }

  input.aggregates.set(input.key, aggregate);
}

function topProducts(products: Map<string, number>, limit: number) {
  return [...products.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

function buildRootCauseSummary(aggregate: RootCauseAggregate) {
  const sampleLines = uniqueLines(aggregate.sampleLines, 3);
  const products = topProducts(aggregate.products, 3);
  const summaryParts = [
    aggregate.cancelSignals > 0 ? `취소 ${aggregate.cancelSignals}건` : "",
    aggregate.reviewSignals > 0 ? `낮은 만족 ${aggregate.reviewSignals}건` : "",
    aggregate.inquirySignals > 0 ? `부정 문의 ${aggregate.inquirySignals}건` : "",
    aggregate.repeatInquirySignals > 0 ? `반복 문의 ${aggregate.repeatInquirySignals}건` : "",
  ].filter(Boolean);

  const summary =
    summaryParts.join(" · ") ||
    `${aggregate.totalSignals}건에서 같은 원인 신호가 반복됐어요.`;

  return {
    key: aggregate.key,
    label: aggregate.label,
    serviceArea: aggregate.serviceArea,
    summary,
    preventionAction: aggregate.preventionAction,
    statLine: `${aggregate.totalSignals}건 신호 · ${aggregate.serviceArea}`,
    products,
    sampleLines,
  };
}

export function buildPharmRootCauseSummary(
  orders: OrderAccordionOrder[]
): PharmRootCauseSummary | null {
  if (orders.length === 0) return null;

  const aggregates = new Map<RootCauseKey, RootCauseAggregate>();
  let cancellationCount = 0;
  let lowSatisfactionCount = 0;
  let repeatInquiryCount = 0;
  let negativeInquiryCount = 0;

  for (const order of orders) {
    const products = getProductNames(order);
    const customerMessages = getCustomerMessages(order);
    const repeatInquiry = hasRepeatInquiry(order, customerMessages);

    if (order.status === ORDER_STATUS.CANCELED) {
      cancellationCount += 1;
      pushSignal({
        aggregates,
        key: "ops_reliability",
        source: "cancel",
        line: "주문 취소로 끝난 흐름이 있었어요.",
        products,
      });
    }

    if (repeatInquiry) {
      repeatInquiryCount += 1;
      pushSignal({
        aggregates,
        key: "ops_reliability",
        source: "repeat_inquiry",
        line: "같은 주문에서 고객 문의가 반복된 흔적이 있어요.",
        products,
      });
    }

    for (const message of customerMessages) {
      const matched = classifyText(message.content);
      if (matched.length === 0) continue;
      negativeInquiryCount += 1;
      for (const key of matched) {
        pushSignal({
          aggregates,
          key,
          source: "inquiry",
          line: compactText(message.content, 96),
          products,
        });
      }
    }

    for (const item of order.orderItems) {
      const review = item.review;
      if (!review || typeof review.rate !== "number" || review.rate > 3) continue;

      lowSatisfactionCount += 1;
      const matched = classifyText(review.content || "");
      const reviewProducts = uniqueLines(
        [item.pharmacyProduct?.product?.name || "상품"],
        2
      );

      if (matched.length === 0) {
        pushSignal({
          aggregates,
          key: "expectation_gap",
          source: "review",
          line:
            compactText(review.content, 96) ||
            ROOT_CAUSE_DEFINITIONS.expectation_gap.fallbackSignal ||
            "낮은 후기 신호가 있었어요.",
          products: reviewProducts,
        });
        continue;
      }

      for (const key of matched) {
        pushSignal({
          aggregates,
          key,
          source: "review",
          line:
            compactText(review.content, 96) ||
            ROOT_CAUSE_DEFINITIONS[key].fallbackSignal ||
            "낮은 후기 신호가 있었어요.",
          products: reviewProducts,
        });
      }
    }
  }

  const rankedRootCauses = [...aggregates.values()]
    .filter((aggregate) => aggregate.totalSignals > 0)
    .sort((left, right) => {
      return (
        right.totalSignals - left.totalSignals ||
        right.cancelSignals - left.cancelSignals ||
        right.repeatInquirySignals - left.repeatInquirySignals
      );
    })
    .slice(0, 3)
    .map(buildRootCauseSummary);

  if (rankedRootCauses.length === 0) return null;

  const leading = rankedRootCauses[0];
  const headline = `${leading.label}이 취소·불만·문의의 공통 원인으로 가장 많이 겹쳐 보여요.`;
  const summary = uniqueLines(
    [
      `${leading.summary} 쪽에서 같은 문제가 반복되고 있어요.`,
      rankedRootCauses[1]
        ? `그다음은 ${rankedRootCauses[1].label}이 따라오고 있어 원인이 한 곳에만 있지는 않아요.`
        : "",
    ],
    2
  ).join(" ");

  const structuralActions = uniqueLines(
    rankedRootCauses.map((item) => `${item.label}: ${item.preventionAction}`),
    3
  );

  return {
    headline,
    summary,
    statBadges: uniqueLines(
      [
        `취소 ${cancellationCount}건`,
        `낮은 만족 ${lowSatisfactionCount}건`,
        `반복 문의 위험 ${repeatInquiryCount}건`,
        `부정 문의 ${negativeInquiryCount}건`,
      ],
      4
    ),
    rootCauses: rankedRootCauses,
    structuralActions,
  };
}
