import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";
import { ORDER_STATUS, type OrderStatus } from "@/lib/order/orderStatus";

export type RiderOpsCopilot = {
  score: number;
  tone: "strong" | "medium" | "soft";
  badgeLabel: string;
  title: string;
  helper: string;
  recommendedStatus?: OrderStatus;
  reasonLines: string[];
};

export type RiderOpsQueueSummary = {
  headline: string;
  summary: string;
  statBadges: string[];
};

export type PharmStatusCopilot = {
  tone: "strong" | "medium" | "soft";
  badgeLabel: string;
  title: string;
  helper: string;
  recommendedStatus?: OrderStatus;
  reasonLines: string[];
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

function hasSpecialRequest(order: OrderAccordionOrder) {
  return Boolean(
    compactText(order.requestNotes) ||
      compactText(order.entrancePassword) ||
      compactText(order.directions)
  );
}

function sortMessages(messages?: OrderMessage[]) {
  if (!Array.isArray(messages)) return [];
  return [...messages].sort((left, right) => left.timestamp - right.timestamp);
}

function hasCustomerWaiting(messages?: OrderMessage[]) {
  const sorted = sortMessages(messages);
  if (sorted.length === 0) return false;
  const latest = sorted[sorted.length - 1];
  return typeof latest.pharmacyId !== "number";
}

function hasPharmacyMessage(messages?: OrderMessage[]) {
  return sortMessages(messages).some((message) => typeof message.pharmacyId === "number");
}

function hasCounselGuidance(messages?: OrderMessage[]) {
  return sortMessages(messages).some((message) => {
    if (typeof message.pharmacyId !== "number") return false;
    const text = compactText(message.content, 240).toLowerCase();
    return (
      text.includes("복용") ||
      text.includes("섭취") ||
      text.includes("주의") ||
      text.includes("시간") ||
      text.includes("함께") ||
      text.length >= 50
    );
  });
}

export function buildRiderOrderCopilot(order: OrderAccordionOrder): RiderOpsCopilot {
  const ageHours = hoursSince(order.createdAt);
  const specialRequest = hasSpecialRequest(order);
  const itemCount = order.orderItems.length;
  const reasonLines: string[] = [];

  if (order.status === ORDER_STATUS.DISPENSE_COMPLETE) {
    if (specialRequest) {
      reasonLines.push("배송 요청사항과 공동현관 정보가 있어 픽업 전에 한 번 더 읽는 편이 좋아요.");
    }
    if (itemCount >= 2) {
      reasonLines.push(`주문 구성이 ${itemCount}개라 약국에서 수량과 품목을 같이 확인하면 실수가 줄어요.`);
    }
    if (ageHours >= 2) {
      reasonLines.push(`조제 완료 뒤 ${ageHours}시간 지났어요. 지금 잡으면 픽업 지연을 줄일 수 있어요.`);
    }

    return {
      score: 90 + ageHours + (specialRequest ? 10 : 0) + Math.min(itemCount, 4),
      tone: ageHours >= 6 ? "strong" : "medium",
      badgeLabel: "픽업 우선",
      title: "지금은 약국 픽업부터 먼저 잡는 주문이에요.",
      helper: "조제 완료 상태라 다음 액션은 보통 픽업 완료 처리입니다. 출발 전 요청사항과 수량만 짧게 확인하면 돼요.",
      recommendedStatus: ORDER_STATUS.PICKUP_COMPLETE,
      reasonLines: uniqueLines(
        reasonLines.length > 0
          ? reasonLines
          : ["조제 완료 상태라 라이더가 이어받을 차례예요."],
        3
      ),
    };
  }

  if (order.status === ORDER_STATUS.PICKUP_COMPLETE) {
    reasonLines.push("이미 픽업 완료 상태라 남은 핵심 액션은 배송 완료 처리예요.");
    if (specialRequest) {
      reasonLines.push("공동현관 비밀번호나 길 안내가 있어 도착 직전 다시 보는 편이 좋아요.");
    }
    if (ageHours >= 2) {
      reasonLines.push(`주문 생성 후 ${ageHours}시간 지나 배송 마무리를 먼저 보는 편이 좋아요.`);
    }

    return {
      score: 72 + ageHours + (specialRequest ? 10 : 0),
      tone: ageHours >= 5 ? "strong" : "medium",
      badgeLabel: "배송 마무리",
      title: "지금은 배송 완료까지 마무리할 차례예요.",
      helper: "픽업은 끝난 상태라 주소와 공동현관 정보만 다시 보고 배송 완료 처리로 이어가면 됩니다.",
      recommendedStatus: ORDER_STATUS.DELIVERY_COMPLETE,
      reasonLines: uniqueLines(reasonLines, 3),
    };
  }

  return {
    score: 10,
    tone: "soft",
    badgeLabel: "확인용",
    title: "지금은 별도 상태 전환보다 주문 정보 확인 위주로 보면 돼요.",
    helper: "이미 마무리 단계에 가까워 급한 액션은 크지 않아요.",
    reasonLines: ["현재 주문 상태 기준으로 급한 다음 전환은 보이지 않아요."],
  };
}

export function compareRiderOrdersByOpsPriority(
  left: OrderAccordionOrder,
  right: OrderAccordionOrder
) {
  const leftCopilot = buildRiderOrderCopilot(left);
  const rightCopilot = buildRiderOrderCopilot(right);

  if (leftCopilot.score !== rightCopilot.score) {
    return rightCopilot.score - leftCopilot.score;
  }

  const leftCreatedAt = toDate(left.createdAt)?.getTime() ?? 0;
  const rightCreatedAt = toDate(right.createdAt)?.getTime() ?? 0;
  return rightCreatedAt - leftCreatedAt;
}

export function buildRiderOpsQueueSummary(
  orders: OrderAccordionOrder[]
): RiderOpsQueueSummary | null {
  if (!Array.isArray(orders) || orders.length === 0) return null;

  const pickupCount = orders.filter(
    (order) => order.status === ORDER_STATUS.DISPENSE_COMPLETE
  ).length;
  const deliveryCount = orders.filter(
    (order) => order.status === ORDER_STATUS.PICKUP_COMPLETE
  ).length;
  const requestCount = orders.filter((order) => hasSpecialRequest(order)).length;
  const topOrder = [...orders].sort(compareRiderOrdersByOpsPriority)[0];

  const headline =
    pickupCount > 0
      ? `지금은 픽업부터 볼 주문이 ${pickupCount}건이에요.`
      : deliveryCount > 0
      ? `지금은 배송 마무리 주문 ${deliveryCount}건을 먼저 정리하면 좋아요.`
      : "현재 라이더 큐는 기본 확인 순서로 보면 돼요.";

  const summary = topOrder
    ? `가장 먼저 볼 주문은 #${topOrder.id}이고, ${buildRiderOrderCopilot(topOrder).title.replace(
        /\.$/,
        ""
      )} 흐름으로 보고 있어요.`
    : "현재 큐에 잡힌 주문이 없어요.";

  return {
    headline,
    summary,
    statBadges: uniqueLines(
      [
        pickupCount > 0 ? `픽업 우선 ${pickupCount}건` : "",
        deliveryCount > 0 ? `배송 마무리 ${deliveryCount}건` : "",
        requestCount > 0 ? `요청사항 확인 ${requestCount}건` : "",
      ].filter(Boolean),
      3
    ),
  };
}

export function buildPharmStatusCopilot(input: {
  order: OrderAccordionOrder;
  messages?: OrderMessage[];
}): PharmStatusCopilot {
  const { order } = input;
  const messages = sortMessages(input.messages);
  const reasonLines: string[] = [];
  const customerWaiting = hasCustomerWaiting(messages);
  const pharmacyStarted = hasPharmacyMessage(messages);
  const guidanceSent = hasCounselGuidance(messages);

  if (order.status === ORDER_STATUS.PAYMENT_COMPLETE) {
    if (customerWaiting) {
      return {
        tone: "strong",
        badgeLabel: "답변 먼저",
        title: "상태 전환보다 고객 답변을 먼저 보는 편이 좋아요.",
        helper: "고객 마지막 메시지가 남아 있어 상담 완료로 넘기기보다 답변부터 붙이는 쪽이 안전해요.",
        reasonLines: ["고객 메시지가 마지막으로 남아 있어 응답 없이 상태만 넘기면 혼선이 생길 수 있어요."],
      };
    }

    if (!pharmacyStarted) {
      return {
        tone: "medium",
        badgeLabel: "상담 시작",
        title: "버튼보다 첫 상담 메시지를 먼저 여는 주문이에요.",
        helper: "아직 약국 첫 메시지가 없어 상담 완료보다 접수/복용 안내를 먼저 보내는 편이 자연스러워요.",
        reasonLines: ["현재 대화 기준으로 약국 첫 안내가 아직 보이지 않아요."],
      };
    }

    if (guidanceSent) {
      reasonLines.push("복용 또는 주의 안내가 이미 보여 상담 단계는 어느 정도 정리된 흐름이에요.");
      if (hasSpecialRequest(order)) {
        reasonLines.push("요청사항도 함께 확인됐다면 상담 완료로 넘겨도 흐름이 자연스러워요.");
      }

      return {
        tone: "medium",
        badgeLabel: "상담 완료 후보",
        title: "지금은 상담 완료로 넘길 가능성이 큰 주문이에요.",
        helper: "복용 안내가 이미 들어가 있어 추가 질문이 없다면 상담 완료 버튼이 다음 후보예요.",
        recommendedStatus: ORDER_STATUS.COUNSEL_COMPLETE,
        reasonLines: uniqueLines(reasonLines, 3),
      };
    }

    return {
      tone: "soft",
      badgeLabel: "확인 후 전환",
      title: "상담 단계는 시작됐지만, 상태 전환 전 한 번 더 확인하는 편이 좋아요.",
      helper: "복용 안내나 마지막 확인 질문이 부족하면 상담 완료 대신 메시지를 한 번 더 정리하는 쪽이 자연스러워요.",
      reasonLines: ["약국 메시지는 있지만 상담 마무리 근거는 아직 약한 편이에요."],
    };
  }

  if (order.status === ORDER_STATUS.COUNSEL_COMPLETE) {
    reasonLines.push("상담 완료 상태라 다음 운영 단계는 보통 조제 완료 처리예요.");
    if (hasSpecialRequest(order)) {
      reasonLines.push("조제 전 요청사항을 한 번 더 보고 포장/전달 실수를 줄이는 편이 좋아요.");
    }

    return {
      tone: "medium",
      badgeLabel: "조제 완료 후보",
      title: "지금은 조제 완료로 넘길 후보로 보고 있어요.",
      helper: "상담은 끝난 흐름이라 실제 준비가 끝났다면 조제 완료 버튼이 다음 액션이에요.",
      recommendedStatus: ORDER_STATUS.DISPENSE_COMPLETE,
      reasonLines: uniqueLines(reasonLines, 3),
    };
  }

  if (order.status === ORDER_STATUS.DISPENSE_COMPLETE) {
    return {
      tone: "soft",
      badgeLabel: "라이더 대기",
      title: "약국 쪽 다음 큰 상태 전환은 거의 끝난 주문이에요.",
      helper: "지금은 라이더 픽업 대기 단계라 추가 상태 변경보다 인계 준비를 보는 편이 좋아요.",
      reasonLines: ["조제 완료 이후에는 라이더 인계와 특이사항 전달이 더 중요해요."],
    };
  }

  return {
    tone: "soft",
    badgeLabel: "기본 확인",
    title: "현재 상태 기준으로는 기본 순서대로 확인하면 돼요.",
    helper: "이 주문은 별도 강한 상태 전환 추천보다 기본 체크가 우선이에요.",
    reasonLines: ["지금 보이는 정보 안에서는 기본 운영 순서에서 크게 벗어나지 않아요."],
  };
}
