import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { buildPharmHumanPriority } from "@/lib/pharm/human-priority";

type PharmAbuseTone = "critical" | "warn" | "watch";

export type PharmAbuseReviewAlert = {
  id: string;
  tone: PharmAbuseTone;
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  reasonLines: string[];
  affectedOrderIds: number[];
};

export type PharmAbuseReviewSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
  alerts: PharmAbuseReviewAlert[];
  orderScores: Record<number, number>;
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

function normalizePhoneDigits(value: string | undefined) {
  return (value || "").replace(/\D/g, "");
}

function compactText(value: string | null | undefined, max = 72) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
}

function normalizeForMatch(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function uniqueLines(lines: string[], limit = lines.length) {
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

function productSignature(order: OrderAccordionOrder) {
  const items = order.orderItems
    .map((item) => {
      const name = compactText(item.pharmacyProduct?.product?.name, 28);
      const option = compactText(item.pharmacyProduct?.optionType, 24);
      if (!name) return "";
      return option ? `${name}:${option}` : name;
    })
    .filter(Boolean)
    .sort();

  return items.join("|");
}

function customerMessages(order: OrderAccordionOrder) {
  return (order.messagesPreview || []).filter(
    (message) => typeof message.pharmacyId !== "number"
  );
}

function repeatedCustomerMessage(order: OrderAccordionOrder) {
  const counts = new Map<string, number>();

  for (const message of customerMessages(order)) {
    const normalized = normalizeForMatch(message.content);
    if (!normalized || normalized.length < 4) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([text, count]) => ({ text, count }));
}

function pushScore(scores: Map<number, number>, orderIds: number[], value: number) {
  for (const orderId of orderIds) {
    scores.set(orderId, (scores.get(orderId) || 0) + value);
  }
}

function buildSamePhoneBurstAlert(
  orders: OrderAccordionOrder[],
  scores: Map<number, number>
) {
  const byPhone = new Map<string, OrderAccordionOrder[]>();

  for (const order of orders) {
    const phone = normalizePhoneDigits(order.phone);
    if (!phone) continue;
    const list = byPhone.get(phone) || [];
    list.push(order);
    byPhone.set(phone, list);
  }

  const flagged = [...byPhone.entries()]
    .map(([phone, phoneOrders]) => {
      const recentOrders = phoneOrders
        .filter((order) => hoursSince(order.createdAt) <= 24)
        .sort(
          (left, right) =>
            (toDate(right.createdAt)?.getTime() ?? 0) -
            (toDate(left.createdAt)?.getTime() ?? 0)
        );
      if (recentOrders.length < 3) return null;

      return {
        phone,
        orders: recentOrders,
      };
    })
    .filter((entry): entry is { phone: string; orders: OrderAccordionOrder[] } => entry !== null)
    .sort((left, right) => right.orders.length - left.orders.length);

  if (flagged.length === 0) return null;

  const top = flagged[0];
  const affectedOrderIds = top.orders.slice(0, 5).map((order) => order.id);
  pushScore(scores, affectedOrderIds, 7);

  return {
    id: "same-phone-burst",
    tone: top.orders.length >= 4 ? "critical" : "warn",
    label: "반복 주문 버스트",
    headline: `같은 번호에서 짧은 시간 안에 주문이 ${top.orders.length}건 몰렸어요.`,
    detail:
      "실수로 중복 결제가 생겼거나, 테스트성 주문/재시도가 섞였을 가능성이 있어 조제 전 유효 주문을 한 번 확인하는 편이 안전해요.",
    actionLabel: "중복 주문 여부 먼저 확인",
    reasonLines: uniqueLines(
      top.orders.slice(0, 3).map((order) => {
        return `주문 #${order.id}: ${hoursSince(order.createdAt)}시간 전 · ${productSignature(order) || "구성 확인 필요"}`;
      }),
      3
    ),
    affectedOrderIds,
  } satisfies PharmAbuseReviewAlert;
}

function buildEndpointBurstAlert(
  orders: OrderAccordionOrder[],
  scores: Map<number, number>
) {
  const byEndpoint = new Map<string, OrderAccordionOrder[]>();

  for (const order of orders) {
    if (!order.endpoint) continue;
    const list = byEndpoint.get(order.endpoint) || [];
    list.push(order);
    byEndpoint.set(order.endpoint, list);
  }

  const flagged = [...byEndpoint.values()]
    .map((endpointOrders) => {
      const recent = endpointOrders
        .filter((order) => hoursSince(order.createdAt) <= 6)
        .sort(
          (left, right) =>
            (toDate(right.createdAt)?.getTime() ?? 0) -
            (toDate(left.createdAt)?.getTime() ?? 0)
        );
      if (recent.length < 3) return null;
      return recent;
    })
    .filter((entry): entry is OrderAccordionOrder[] => entry !== null)
    .sort((left, right) => right.length - left.length);

  if (flagged.length === 0) return null;

  const top = flagged[0];
  const affectedOrderIds = top.slice(0, 5).map((order) => order.id);
  pushScore(scores, affectedOrderIds, 6);

  return {
    id: "same-device-burst",
    tone: top.length >= 4 ? "critical" : "warn",
    label: "같은 기기 반복 시도",
    headline: `같은 기기 흐름에서 주문이 ${top.length}건 연속으로 생겼어요.`,
    detail:
      "체크아웃 재시도나 비정상 자동 요청일 수 있어, 바로 차단하기보다 어떤 주문이 실제 유효한지 먼저 확인하는 쪽이 안전해요.",
    actionLabel: "유효 주문 1건만 남길지 확인",
    reasonLines: uniqueLines(
      top.slice(0, 3).map((order) => {
        return `주문 #${order.id}: ${hoursSince(order.createdAt)}시간 전 · ${order.status || "상태 확인 필요"}`;
      }),
      3
    ),
    affectedOrderIds,
  } satisfies PharmAbuseReviewAlert;
}

function buildRetryCancelAlert(
  orders: OrderAccordionOrder[],
  scores: Map<number, number>
) {
  const byPhone = new Map<string, OrderAccordionOrder[]>();

  for (const order of orders) {
    const phone = normalizePhoneDigits(order.phone);
    if (!phone) continue;
    const list = byPhone.get(phone) || [];
    list.push(order);
    byPhone.set(phone, list);
  }

  const flagged = [...byPhone.values()]
    .map((phoneOrders) => {
      const recentOrders = phoneOrders.filter((order) => hoursSince(order.createdAt) <= 48);
      const canceled = recentOrders.filter(
        (order) => order.status === ORDER_STATUS.CANCELED
      );
      const active = recentOrders.filter(
        (order) => order.status !== ORDER_STATUS.CANCELED
      );
      if (canceled.length < 2 || active.length === 0) return null;
      return {
        canceled,
        active,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        canceled: OrderAccordionOrder[];
        active: OrderAccordionOrder[];
      } => entry !== null
    )
    .sort((left, right) => right.canceled.length - left.canceled.length);

  if (flagged.length === 0) return null;

  const top = flagged[0];
  const affectedOrderIds = [...top.active, ...top.canceled].slice(0, 5).map((order) => order.id);
  pushScore(scores, affectedOrderIds, 5);

  return {
    id: "retry-after-cancel",
    tone: "warn",
    label: "취소 후 재시도 반복",
    headline: `취소 뒤 다시 시도한 흔적이 반복돼 실제 진행 의사를 다시 확인하는 편이 좋아요.`,
    detail:
      "고의 사용보다도 결제·주소·설명 문제로 여러 번 다시 시도하는 경우가 섞일 수 있어, 준비 전에 한 번 더 확인하면 정상 사용자 피해를 줄일 수 있어요.",
    actionLabel: "조제 전 확인 연락 먼저",
    reasonLines: uniqueLines(
      [
        `취소 ${top.canceled.length}건 후 진행 중 주문 ${top.active.length}건이 남아 있어요.`,
        ...top.active.slice(0, 2).map((order) => `진행 중 주문 #${order.id}: ${productSignature(order) || "구성 확인 필요"}`),
      ],
      3
    ),
    affectedOrderIds,
  } satisfies PharmAbuseReviewAlert;
}

function buildRepeatedMessageAlert(
  orders: OrderAccordionOrder[],
  scores: Map<number, number>
) {
  const flagged = orders
    .map((order) => ({
      order,
      repeats: repeatedCustomerMessage(order),
    }))
    .filter((entry) => entry.repeats.length > 0)
    .sort((left, right) => right.repeats[0].count - left.repeats[0].count);

  if (flagged.length === 0) return null;

  const top = flagged[0];
  const affectedOrderIds = flagged.slice(0, 4).map((entry) => entry.order.id);
  pushScore(scores, affectedOrderIds, 4);

  return {
    id: "repeated-message",
    tone: top.repeats[0].count >= 3 ? "warn" : "watch",
    label: "반복 문의 패턴",
    headline: `같은 문의가 반복된 주문이 보여, 스팸인지 막힘인지 먼저 구분하는 편이 좋아요.`,
    detail:
      "바로 악용으로 단정하지 말고, 한 문장 확인으로 같은 질문 반복인지 실제 막힘인지 분리하면 정상 사용자 경험을 덜 해칠 수 있어요.",
    actionLabel: "한 번에 묻고 한 번에 안내",
    reasonLines: uniqueLines(
      flagged.slice(0, 3).map((entry) => {
        const repeat = entry.repeats[0];
        return `주문 #${entry.order.id}: "${compactText(repeat.text, 32)}" 성격의 문의가 ${repeat.count}번 반복됐어요.`;
      }),
      3
    ),
    affectedOrderIds,
  } satisfies PharmAbuseReviewAlert;
}

export function buildPharmAbuseReviewSummary(
  orders: OrderAccordionOrder[]
): PharmAbuseReviewSummary | null {
  if (!orders.length) return null;

  const recentOrders = orders.filter((order) => hoursSince(order.createdAt) <= 72);
  const orderScores = new Map<number, number>();

  const alerts = [
    buildSamePhoneBurstAlert(recentOrders, orderScores),
    buildEndpointBurstAlert(recentOrders, orderScores),
    buildRetryCancelAlert(recentOrders, orderScores),
    buildRepeatedMessageAlert(recentOrders, orderScores),
  ]
    .filter((alert): alert is PharmAbuseReviewAlert => alert !== null)
    .sort((left, right) => {
      const toneScore = { critical: 3, warn: 2, watch: 1 };
      if (toneScore[left.tone] !== toneScore[right.tone]) {
        return toneScore[right.tone] - toneScore[left.tone];
      }
      return right.affectedOrderIds.length - left.affectedOrderIds.length;
    })
    .slice(0, 4);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((alert) => alert.tone === "critical").length;

  return {
    headline:
      criticalCount > 0
        ? `검토가 먼저 붙어야 할 비정상 흐름이 ${criticalCount}개 보여요.`
        : "섣불리 차단하기보다 먼저 확인할 비정상 흐름이 보여요.",
    summary:
      "중복 주문, 같은 기기 재시도, 취소 후 재시도, 반복 문의처럼 정상 사용자 실수와 악용이 섞일 수 있는 흐름만 좁게 골랐어요.",
    statBadges: uniqueLines(
      [
        `리뷰 필요 ${alerts.length}개`,
        criticalCount > 0 ? `강한 신호 ${criticalCount}개` : "",
        `최근 ${recentOrders.length}건 기준`,
      ],
      3
    ),
    alerts,
    orderScores: Object.fromEntries(orderScores.entries()),
  };
}

export function rankOrdersByPharmAbuseReview(params: {
  visibleOrders: OrderAccordionOrder[];
  contextOrders: OrderAccordionOrder[];
}) {
  const reviewSummary = buildPharmAbuseReviewSummary(params.contextOrders);
  const scores = reviewSummary?.orderScores ?? {};

  return [...params.visibleOrders].sort((left, right) => {
    const leftScore = scores[left.id] || 0;
    const rightScore = scores[right.id] || 0;
    if (leftScore !== rightScore) return rightScore - leftScore;

    const leftHuman = buildPharmHumanPriority({ order: left }).score;
    const rightHuman = buildPharmHumanPriority({ order: right }).score;
    if (leftHuman !== rightHuman) return rightHuman - leftHuman;

    const leftCreatedAt = toDate(left.createdAt)?.getTime() ?? 0;
    const rightCreatedAt = toDate(right.createdAt)?.getTime() ?? 0;
    return rightCreatedAt - leftCreatedAt;
  });
}
