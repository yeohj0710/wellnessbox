import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";

type PharmAnomalyTone = "critical" | "warn" | "watch";

export type PharmAnomalyAlert = {
  id: string;
  tone: PharmAnomalyTone;
  label: string;
  headline: string;
  detail: string;
  actionLabel: string;
  reasonLines: string[];
  affectedOrderIds: number[];
};

export type PharmAnomalyRadarSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
  alerts: PharmAnomalyAlert[];
};

function toDate(value: string | number | Date | null | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function hoursSince(value: string | number | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function compactText(value: string | null | undefined, max = 70) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}...`;
}

function uniqueLines(lines: string[], limit = lines.length) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = compactText(line, 160);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function getMessages(order: OrderAccordionOrder) {
  const source = Array.isArray(order.messagesPreview) ? order.messagesPreview : [];
  return [...source].sort((left, right) => left.timestamp - right.timestamp);
}

function isCustomerMessage(message: OrderMessage) {
  return typeof message.pharmacyId !== "number";
}

function isOpenOrder(order: OrderAccordionOrder) {
  return (
    order.status !== ORDER_STATUS.CANCELED &&
    order.status !== ORDER_STATUS.DELIVERY_COMPLETE
  );
}

function hasSpecialRequest(order: OrderAccordionOrder) {
  return Boolean(
    compactText(order.requestNotes) ||
      compactText(order.directions) ||
      compactText(order.entrancePassword)
  );
}

function getWaitingCustomerOrders(orders: OrderAccordionOrder[]) {
  return orders.filter((order) => {
    const messages = getMessages(order);
    if (messages.length === 0) return false;
    const latest = messages[messages.length - 1];
    return isCustomerMessage(latest) && hoursSince(latest.createdAt) <= 12;
  });
}

function countTrailingCustomerMessages(messages: OrderMessage[]) {
  let count = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (!isCustomerMessage(messages[index])) break;
    count += 1;
  }
  return count;
}

function buildReplyBurstAlert(orders: OrderAccordionOrder[]) {
  const waiting = getWaitingCustomerOrders(orders)
    .map((order) => ({
      order,
      trailingCustomerMessages: countTrailingCustomerMessages(getMessages(order)),
      latestCustomerAt: getMessages(order)[getMessages(order).length - 1]?.createdAt,
    }))
    .filter((entry) => entry.trailingCustomerMessages >= 1)
    .sort(
      (left, right) =>
        hoursSince(left.latestCustomerAt) - hoursSince(right.latestCustomerAt)
    );

  if (waiting.length < 3) return null;

  const repeated = waiting.filter((entry) => entry.trailingCustomerMessages >= 2);
  const headline =
    repeated.length > 0
      ? `고객 재문의가 한꺼번에 쌓인 주문이 ${waiting.length}건 보여요.`
      : `답변이 필요한 고객 메시지가 짧은 시간 안에 ${waiting.length}건 모였어요.`;

  return {
    id: "reply-burst",
    tone: repeated.length >= 2 ? "critical" : "warn",
    label: repeated.length >= 2 ? "응답 폭주" : "응답 대기 증가",
    headline,
    detail:
      repeated.length > 0
        ? "같은 주문에서 고객 메시지가 연속으로 쌓여 있어 먼저 답하지 않으면 CS가 더 커질 가능성이 높아요."
        : "최근 고객 메시지가 여러 건 밀려 있어 지금 먼저 응답 큐를 비우는 편이 좋아요.",
    actionLabel: "고객 메시지부터 먼저 정리하기",
    reasonLines: uniqueLines(
      waiting.slice(0, 3).map((entry) => {
        const age = hoursSince(entry.latestCustomerAt);
        return `주문 #${entry.order.id}: 고객 메시지 ${entry.trailingCustomerMessages}개 연속, 마지막 문의 ${age}시간 전`;
      }),
      3
    ),
    affectedOrderIds: waiting.slice(0, 5).map((entry) => entry.order.id),
  } satisfies PharmAnomalyAlert;
}

function buildStalledPaymentAlert(orders: OrderAccordionOrder[]) {
  const stalled = orders.filter((order) => {
    if (!isOpenOrder(order)) return false;
    if (order.status !== ORDER_STATUS.PAYMENT_COMPLETE) return false;
    if (hoursSince(order.createdAt) < 6) return false;
    const hasPharmacyMessage = getMessages(order).some(
      (message) => typeof message.pharmacyId === "number"
    );
    return !hasPharmacyMessage;
  });

  if (stalled.length < 2) return null;

  return {
    id: "stalled-payment",
    tone: stalled.length >= 4 ? "critical" : "warn",
    label: "상태 정체",
    headline: `결제 완료 뒤 다음 단계로 안 넘어간 주문이 ${stalled.length}건 있어요.`,
    detail:
      "접수 안내나 첫 상담 메시지가 늦어지면 고객이 결제 후에도 멈춘 느낌을 받아 문의가 빠르게 늘 수 있어요.",
    actionLabel: "지연된 접수 주문 먼저 열기",
    reasonLines: uniqueLines(
      stalled.slice(0, 3).map((order) => {
        const age = hoursSince(order.createdAt);
        return `주문 #${order.id}: 결제 완료 후 ${age}시간 지났지만 약국 첫 메시지가 아직 없어요.`;
      }),
      3
    ),
    affectedOrderIds: stalled.slice(0, 5).map((order) => order.id),
  } satisfies PharmAnomalyAlert;
}

function buildSpecialRequestAlert(orders: OrderAccordionOrder[]) {
  const flagged = orders.filter((order) => {
    if (!isOpenOrder(order)) return false;
    if (!hasSpecialRequest(order)) return false;
    if (hoursSince(order.createdAt) < 4) return false;
    const orderMessages = getMessages(order);
    const latestMessage = orderMessages[orderMessages.length - 1];
    return !latestMessage || isCustomerMessage(latestMessage);
  });

  if (flagged.length < 2) return null;

  return {
    id: "special-request-gap",
    tone: "watch",
    label: "요청 누락 위험",
    headline: `배송/수령 요청이 있는 주문 ${flagged.length}건이 아직 다시 확인되지 않았어요.`,
    detail:
      "문 앞 비밀번호, 길 안내, 요청사항이 오래 방치되면 오배송이나 재문의로 이어질 수 있어요.",
    actionLabel: "요청사항 있는 주문부터 체크하기",
    reasonLines: uniqueLines(
      flagged.slice(0, 3).map((order) => {
        const request = compactText(
          order.requestNotes || order.directions || order.entrancePassword,
          42
        );
        return `주문 #${order.id}: "${request}" 확인이 아직 대화에 남지 않았어요.`;
      }),
      3
    ),
    affectedOrderIds: flagged.slice(0, 5).map((order) => order.id),
  } satisfies PharmAnomalyAlert;
}

function buildStockPressureAlert(orders: OrderAccordionOrder[]) {
  const byOption = new Map<
    string,
    {
      productName: string;
      optionType: string;
      stock: number;
      totalQuantity: number;
      orderIds: number[];
    }
  >();

  for (const order of orders) {
    if (!isOpenOrder(order)) continue;
    if (hoursSince(order.createdAt) > 36) continue;

    for (const item of order.orderItems) {
      const productName = compactText(item.pharmacyProduct?.product?.name, 40);
      const optionType = compactText(item.pharmacyProduct?.optionType, 30);
      const stock = item.pharmacyProduct?.stock;
      const quantity = item.quantity ?? 0;
      if (!productName || !optionType || typeof stock !== "number") continue;
      const key = `${productName}::${optionType}`;
      const current = byOption.get(key);
      if (current) {
        current.totalQuantity += quantity;
        if (!current.orderIds.includes(order.id)) current.orderIds.push(order.id);
        current.stock = Math.min(current.stock, stock);
        continue;
      }

      byOption.set(key, {
        productName,
        optionType,
        stock,
        totalQuantity: quantity,
        orderIds: [order.id],
      });
    }
  }

  const pressured = [...byOption.values()]
    .filter(
      (entry) =>
        entry.orderIds.length >= 2 &&
        (entry.stock <= 2 || entry.totalQuantity >= Math.max(1, entry.stock))
    )
    .sort((left, right) => {
      const leftPressure = left.totalQuantity - left.stock;
      const rightPressure = right.totalQuantity - right.stock;
      return rightPressure - leftPressure;
    });

  if (pressured.length === 0) return null;

  const top = pressured[0];
  return {
    id: "stock-pressure",
    tone: top.totalQuantity > top.stock ? "critical" : "warn",
    label: "재고 압박",
    headline: `${top.productName} ${top.optionType} 주문이 몰려 현재 재고 압박이 보여요.`,
    detail:
      top.totalQuantity > top.stock
        ? "최근 주문 수량이 현재 보이는 재고보다 커서 품절/대체 안내를 먼저 준비하는 편이 안전해요."
        : "남은 재고가 매우 적은데 같은 옵션 주문이 겹치고 있어 조기 품절 가능성을 먼저 봐야 해요.",
    actionLabel: "재고 확인 후 대체안 준비하기",
    reasonLines: uniqueLines(
      pressured.slice(0, 3).map((entry) => {
        return `${entry.productName} ${entry.optionType}: 최근 주문 ${entry.totalQuantity}개, 현재 재고 ${entry.stock}개, 관련 주문 ${entry.orderIds.length}건`;
      }),
      3
    ),
    affectedOrderIds: top.orderIds.slice(0, 5),
  } satisfies PharmAnomalyAlert;
}

export function buildPharmAnomalyRadarSummary(
  orders: OrderAccordionOrder[]
): PharmAnomalyRadarSummary | null {
  if (!Array.isArray(orders) || orders.length === 0) return null;

  const recentOrders = orders
    .filter((order) => hoursSince(order.createdAt) <= 72)
    .sort((left, right) => hoursSince(left.createdAt) - hoursSince(right.createdAt));

  const alerts = [
    buildReplyBurstAlert(recentOrders),
    buildStalledPaymentAlert(recentOrders),
    buildStockPressureAlert(recentOrders),
    buildSpecialRequestAlert(recentOrders),
  ]
    .filter((alert): alert is PharmAnomalyAlert => alert !== null)
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
  const stockCount = alerts.filter((alert) => alert.id === "stock-pressure").length;
  const waitingOrders = getWaitingCustomerOrders(recentOrders).length;

  return {
    headline:
      criticalCount > 0
        ? `지금 바로 대응할 이상징후가 ${criticalCount}개 보여요.`
        : "운영 흐름에서 평소와 다른 신호가 먼저 잡혔어요.",
    summary:
      "최근 주문·메시지·재고 흐름을 함께 보고, 사람이 놓치기 쉬운 대응 우선 이슈만 먼저 추렸어요.",
    statBadges: uniqueLines(
      [
        `이상징후 ${alerts.length}개`,
        criticalCount > 0 ? `긴급 ${criticalCount}개` : "",
        waitingOrders > 0 ? `응답 대기 주문 ${waitingOrders}건` : "",
        stockCount > 0 ? "재고 압박 감지" : "",
      ].filter(Boolean),
      4
    ),
    alerts,
  };
}
