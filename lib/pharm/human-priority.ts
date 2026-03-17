import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";
import { buildPharmOrderTriage } from "@/lib/pharm/triage";

type HumanPriorityTier = "critical" | "high" | "growth" | "normal";

export type PharmHumanPriority = {
  score: number;
  tier: HumanPriorityTier;
  tierLabel: string;
  headline: string;
  summary: string;
  badges: string[];
  reasons: string[];
  nextAction: string;
};

export type PharmHumanPriorityQueueSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
  candidates: Array<{
    orderId: number;
    tierLabel: string;
    headline: string;
    nextAction: string;
    products: string;
  }>;
};

function toDate(value: string | number | Date | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function hoursSince(value: string | number | Date | undefined) {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function compactText(value: string | null | undefined, max = 96) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
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

function normalizeForMatch(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function getMessages(order: OrderAccordionOrder, messages?: OrderMessage[]) {
  const source = Array.isArray(messages)
    ? messages
    : Array.isArray(order.messagesPreview)
      ? order.messagesPreview
      : [];

  return [...source].sort((left, right) => left.timestamp - right.timestamp);
}

function customerMessages(order: OrderAccordionOrder, messages?: OrderMessage[]) {
  return getMessages(order, messages).filter(
    (message) => typeof message.pharmacyId !== "number"
  );
}

function getProductNames(order: OrderAccordionOrder) {
  return uniqueLines(
    order.orderItems.map((item) => item.pharmacyProduct?.product?.name || "상품"),
    3
  );
}

function hasMixedCategories(order: OrderAccordionOrder) {
  const categories = order.orderItems.flatMap((item) =>
    item.pharmacyProduct?.product?.categories
      ?.map((category) => compactText(category.name || "", 32))
      .filter(Boolean) || []
  );

  return new Set(categories).size >= 2;
}

function hasAnyPharmacyReply(order: OrderAccordionOrder, messages?: OrderMessage[]) {
  return getMessages(order, messages).some(
    (message) => typeof message.pharmacyId === "number"
  );
}

function sumQuantity(order: OrderAccordionOrder) {
  return order.orderItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}

function matchKeywords(lines: string[], keywords: string[]) {
  const normalizedLines = lines.map((line) => normalizeForMatch(line));
  return keywords.some((keyword) =>
    normalizedLines.some((line) => line.includes(keyword))
  );
}

const SAFETY_KEYWORDS = [
  "부작용",
  "메스",
  "속",
  "어지",
  "가슴",
  "알레르기",
  "임신",
  "수유",
  "병원약",
  "약먹",
  "같이먹",
  "질환",
];

const CHURN_KEYWORDS = [
  "취소",
  "환불",
  "별로",
  "모르겠",
  "효과없",
  "실망",
  "불만",
  "늦",
  "지연",
  "답변",
  "연락",
];

export function buildPharmHumanPriority(input: {
  order: OrderAccordionOrder;
  messages?: OrderMessage[];
}): PharmHumanPriority {
  const { order } = input;
  const triage = buildPharmOrderTriage(input);
  const messages = customerMessages(order, input.messages);
  const signalTexts = [
    ...messages.map((message) => message.content),
    order.requestNotes || "",
    order.directions || "",
  ].filter(Boolean);
  const totalPrice = order.totalPrice ?? 0;
  const itemCount = order.orderItems.length;
  const totalQuantity = sumQuantity(order);
  const ageHours = hoursSince(order.createdAt);
  const mixedCategories = hasMixedCategories(order);
  const hasPharmacyReply = hasAnyPharmacyReply(order, input.messages);

  const safetyRisk = matchKeywords(signalTexts, SAFETY_KEYWORDS);
  const churnRisk =
    order.status === ORDER_STATUS.CANCELED ||
    matchKeywords(signalTexts, CHURN_KEYWORDS) ||
    triage.tone === "urgent";
  const highValue =
    totalPrice >= 80000 ||
    (totalPrice >= 50000 && itemCount >= 2) ||
    itemCount >= 3 ||
    totalQuantity >= 4;
  const delightPotential =
    highValue && !churnRisk && (mixedCategories || !hasPharmacyReply || ageHours >= 2);

  let score = triage.score;
  const reasons: string[] = [];
  const badges: string[] = [];
  let tier: HumanPriorityTier = "normal";
  let tierLabel = "기본 검토";
  let headline = "기본 검토 순서로 보면 되는 사용자예요.";
  let summary = "현재 주문 처리 흐름 안에서 일반적인 상담/안내를 이어가면 돼요.";
  let nextAction = "주문 상태와 복용 안내를 기본 순서대로 확인하세요.";

  if (safetyRisk) {
    score += 7;
    badges.push("고위험");
    reasons.push("복용 불편·병용·질환 관련 표현이 보여 약사 직접 확인 가치가 커요.");
  }

  if (highValue) {
    score += 4;
    badges.push("고가치");
    reasons.push(
      totalPrice >= 50000
        ? `총액 ${totalPrice.toLocaleString()}원대로 큰 주문이라 사람 설명이 전환/만족에 미치는 영향이 커요.`
        : "구성 수가 많아 한 번의 설명 품질이 재구매와 만족에 크게 연결될 수 있어요."
    );
  }

  if (churnRisk) {
    score += 5;
    badges.push("고이탈 가능성");
    reasons.push("취소·부정 반응·응답 지연 신호가 있어 지금 사람이 붙는 가치가 높아요.");
  }

  if (delightPotential) {
    score += 3;
    badges.push("고만족 잠재");
    reasons.push("구성이 진하지만 아직 실망 신호는 약해, 좋은 첫 설명이 만족과 재구매로 이어질 가능성이 높아요.");
  }

  if (safetyRisk) {
    tier = "critical";
    tierLabel = "사람 먼저";
    headline = "약사 직접 확인이 가장 먼저 붙어야 하는 사용자예요.";
    summary =
      "안전 우려와 주문 가치가 같이 보이거나, 작은 오해가 바로 불안으로 번질 수 있는 흐름이에요.";
    nextAction =
      "상품 설명보다 현재 복용약·질환·불편 시점부터 짧게 확인하고, 이후에만 구성 이유를 설명하세요.";
  } else if (churnRisk && highValue) {
    tier = "high";
    tierLabel = "이탈 방지 우선";
    headline = "지금 잡아두면 큰 주문과 만족을 함께 지킬 수 있는 사용자예요.";
    summary =
      "고가치 주문인데 이탈 신호도 같이 있어, 자동 메시지보다 사람이 먼저 기대관리와 안심을 주는 편이 좋아요.";
    nextAction =
      "왜 불안한지 1가지만 먼저 확인하고, 이번 주문에서 달라지는 점과 진행 상황을 짧게 설명하세요.";
  } else if (delightPotential || highValue) {
    tier = "growth";
    tierLabel = "관계 만들기";
    headline = "좋은 첫 설명이 재구매까지 만들기 쉬운 사용자예요.";
    summary =
      "문제가 터지기 전이지만, 구성이 크거나 맞춤 설명 가치가 커서 사람 개입의 투자 대비 효과가 좋아요.";
    nextAction =
      "왜 이 조합인지와 복용 시작 포인트를 1~2문장으로 먼저 정리해 만족 경험을 만들어 주세요.";
  }

  return {
    score,
    tier,
    tierLabel,
    headline,
    summary,
    badges: uniqueLines(
      badges.length > 0 ? badges : ["기본 검토"],
      4
    ),
    reasons: uniqueLines(
      reasons.length > 0
        ? reasons
        : ["현재는 긴급/고가치 신호보다 기본 주문 진행 확인이 먼저예요."],
      3
    ),
    nextAction,
  };
}

export function compareOrdersByHumanPriority(
  left: OrderAccordionOrder,
  right: OrderAccordionOrder
) {
  const leftPriority = buildPharmHumanPriority({ order: left });
  const rightPriority = buildPharmHumanPriority({ order: right });

  if (leftPriority.score !== rightPriority.score) {
    return rightPriority.score - leftPriority.score;
  }

  const leftCreatedAt = toDate(left.createdAt)?.getTime() ?? 0;
  const rightCreatedAt = toDate(right.createdAt)?.getTime() ?? 0;
  return rightCreatedAt - leftCreatedAt;
}

export function buildPharmHumanPriorityQueueSummary(
  orders: OrderAccordionOrder[]
): PharmHumanPriorityQueueSummary | null {
  if (orders.length === 0) return null;

  const prioritized = orders
    .map((order) => ({
      order,
      priority: buildPharmHumanPriority({ order }),
    }))
    .sort((left, right) => {
      if (left.priority.score !== right.priority.score) {
        return right.priority.score - left.priority.score;
      }
      const leftCreatedAt = toDate(left.order.createdAt)?.getTime() ?? 0;
      const rightCreatedAt = toDate(right.order.createdAt)?.getTime() ?? 0;
      return rightCreatedAt - leftCreatedAt;
    });

  const criticalCount = prioritized.filter(
    (entry) => entry.priority.tier === "critical"
  ).length;
  const highCount = prioritized.filter(
    (entry) => entry.priority.tier === "high"
  ).length;
  const growthCount = prioritized.filter(
    (entry) => entry.priority.tier === "growth"
  ).length;

  const headline =
    criticalCount > 0
      ? `약사 직접 확인이 먼저 필요한 사용자 ${criticalCount}명을 맨 앞에 두는 편이 좋아요.`
      : highCount > 0
      ? `이탈을 막으면 가치가 큰 사용자 ${highCount}명이 먼저 보여요.`
      : growthCount > 0
      ? `좋은 설명 한 번이 재구매로 이어질 사용자 ${growthCount}명이 보여요.`
      : "현재는 기본 검토 중심으로 사용자 우선순위를 보면 돼요.";

  const summary = [
    criticalCount > 0 ? `고위험 ${criticalCount}명` : "",
    highCount > 0 ? `이탈 방지 우선 ${highCount}명` : "",
    growthCount > 0 ? `고만족 잠재 ${growthCount}명` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    headline,
    summary: summary || "현재 페이지는 일반 검토 대상이 중심이에요.",
    statBadges: uniqueLines(
      [
        `고위험 ${criticalCount}명`,
        `고이탈 가능성 ${highCount}명`,
        `고만족 잠재 ${growthCount}명`,
      ],
      3
    ),
    candidates: prioritized.slice(0, 3).map(({ order, priority }) => ({
      orderId: order.id,
      tierLabel: priority.tierLabel,
      headline: priority.headline,
      nextAction: priority.nextAction,
      products: getProductNames(order).join(", "),
    })),
  };
}
