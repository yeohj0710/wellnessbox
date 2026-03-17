import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";

export type PharmCopilotDraft = {
  id: string;
  label: string;
  text: string;
};

export type PharmCopilotSummary = {
  priorityLabel: string;
  priorityTone: "strong" | "medium" | "soft";
  overview: string;
  priorityReasons: string[];
  cautionLines: string[];
  counselHighlights: string[];
  draftReplies: PharmCopilotDraft[];
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

function compactText(value: string | null | undefined, max = 80) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
}

function uniqueLines(lines: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const normalized = compactText(line, 140);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function firstSentence(value: string | null | undefined) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  return compactText(sentence, 110);
}

function getLatestMessage(
  messages: OrderMessage[],
  role: "customer" | "pharmacy"
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const isPharmacy = typeof message.pharmacyId === "number";
    if (role === "customer" && !isPharmacy) return message;
    if (role === "pharmacy" && isPharmacy) return message;
  }
  return null;
}

function hasCustomerWaiting(messages: OrderMessage[]) {
  const latestCustomer = getLatestMessage(messages, "customer");
  const latestPharmacy = getLatestMessage(messages, "pharmacy");
  if (!latestCustomer) return false;
  if (!latestPharmacy) return true;
  return latestCustomer.timestamp > latestPharmacy.timestamp;
}

function buildPriority(input: {
  order: OrderAccordionOrder;
  messages: OrderMessage[];
}) {
  const ageHours = hoursSince(input.order.createdAt);
  const waitingForReply = hasCustomerWaiting(input.messages);
  const hasSpecialRequest = Boolean(
    compactText(input.order.requestNotes) ||
      compactText(input.order.directions) ||
      compactText(input.order.entrancePassword)
  );

  let score = 0;
  const reasons: string[] = [];

  if (waitingForReply) {
    score += 4;
    reasons.push("고객 마지막 메시지에 아직 약국 답변이 없어요.");
  }

  if (input.order.status === ORDER_STATUS.PAYMENT_COMPLETE && ageHours >= 6) {
    score += 3;
    reasons.push(`결제 완료 후 ${ageHours}시간이 지나 상담 대기가 길어지고 있어요.`);
  }

  if (hasSpecialRequest) {
    score += 2;
    reasons.push("배송/수령 관련 요청사항이 있어 놓치면 재문의 가능성이 높아요.");
  }

  if ((input.order.orderItems?.length ?? 0) >= 3) {
    score += 1;
    reasons.push("구성 상품 수가 많아 복용 순서와 중복 확인 시간이 더 걸릴 수 있어요.");
  }

  if (score >= 6) {
    return {
      label: "우선 확인",
      tone: "strong" as const,
      reasons: uniqueLines(reasons, 3),
    };
  }

  if (score >= 3) {
    return {
      label: "검토 필요",
      tone: "medium" as const,
      reasons: uniqueLines(reasons, 3),
    };
  }

  return {
    label: "일반 검토",
    tone: "soft" as const,
    reasons: uniqueLines(
      reasons.length > 0
        ? reasons
        : ["기본 확인 질문과 복용 안내를 차분히 정리하면 되는 주문이에요."],
      3
    ),
  };
}

function buildOverview(order: OrderAccordionOrder) {
  const names = order.orderItems
    .map((item) => item.pharmacyProduct?.product?.name || "상품")
    .filter(Boolean);
  const joinedNames = uniqueLines(names, 3).join(", ");
  const itemCount = order.orderItems.length;
  const statusLabel = order.status || "주문 접수";
  return `${statusLabel} 상태의 주문 #${order.id}입니다. ${itemCount}개 상품(${joinedNames || "구성 확인 필요"}) 기준으로 상담과 안내를 정리하면 돼요.`;
}

function buildCautionLines(order: OrderAccordionOrder, messages: OrderMessage[]) {
  const latestCustomer = getLatestMessage(messages, "customer");
  const lines: string[] = [];

  if (compactText(order.requestNotes)) {
    lines.push(`요청사항: ${compactText(order.requestNotes, 120)}`);
  }
  if (compactText(order.directions)) {
    lines.push(`길 안내: ${compactText(order.directions, 120)}`);
  }
  if (compactText(order.entrancePassword)) {
    lines.push("공동현관 비밀번호가 있어 배송/수령 안내에 함께 확인하는 편이 좋아요.");
  }
  if (latestCustomer?.content) {
    lines.push(`최근 고객 메시지: ${compactText(latestCustomer.content, 120)}`);
  }

  const categories = order.orderItems.flatMap((item) =>
    item.pharmacyProduct?.product?.categories
      ?.map((category) => compactText(category.name || "", 30))
      .filter(Boolean) || []
  );
  if (new Set(categories).size >= 2) {
    lines.push("서로 다른 카테고리가 섞여 있어 복용 순서와 중복 여부를 함께 짚어주면 좋아요.");
  }

  return uniqueLines(lines, 4);
}

function buildCounselHighlights(order: OrderAccordionOrder) {
  const highlights = order.orderItems
    .map((item) => firstSentence(item.pharmacyProduct?.product?.description))
    .filter(Boolean);

  if (highlights.length > 0) {
    return uniqueLines(highlights, 3);
  }

  return uniqueLines(
    [
      "현재 복용 중인 약이나 질환 여부를 먼저 확인하면 상담 시간이 훨씬 줄어들어요.",
      "복용 시간을 아침/저녁 한 가지 기준으로 먼저 고정해 안내하면 고객이 이해하기 쉬워요.",
    ],
    3
  );
}

function buildDraftReplies(order: OrderAccordionOrder, messages: OrderMessage[]) {
  const productNames = uniqueLines(
    order.orderItems.map((item) => item.pharmacyProduct?.product?.name || "상품"),
    2
  );
  const productText = productNames.join(", ");
  const latestCustomer = getLatestMessage(messages, "customer");
  const latestCustomerText = compactText(latestCustomer?.content, 70);

  const ackText =
    order.status === ORDER_STATUS.PAYMENT_COMPLETE
      ? `안녕하세요. 주문 확인했고 지금 ${productText || "구성"} 기준으로 상담 내용을 정리하고 있어요. 복용 중인 약이나 진단받은 질환이 있으면 함께 알려주시면 더 빠르게 확인해드릴게요.`
      : `안녕하세요. ${productText || "이번 구성"} 기준으로 현재 진행 상황 확인 중이에요. 지금 단계에서 꼭 확인할 점만 짧게 정리해드릴게요.`;

  const followupText = latestCustomerText
    ? `말씀 주신 "${latestCustomerText}" 내용 확인했어요. 우선 복용 중인 약, 기존 질환, 원하시는 복용 시간대가 있으면 같이 알려주세요. 그 기준으로 겹치거나 주의할 점부터 먼저 안내드릴게요.`
    : `현재 드시는 약이나 기존 질환이 있으면 먼저 알려주세요. 그 기준으로 겹치거나 주의할 점부터 짧게 정리해드릴게요.`;

  const counselText = `이번 주문은 ${productText || "구성 상품"} 기준으로 준비하고 있어요. 복용은 한 번에 많이 늘리기보다 식사 흐름에 붙여 같은 시간대로 시작하는 편이 좋아요. 원하시면 아침/저녁 기준으로 복용 순서를 짧게 정리해드릴게요.`;

  return [
    {
      id: "ack",
      label: "접수 안내 초안",
      text: ackText,
    },
    {
      id: "followup",
      label: "추가 확인 초안",
      text: followupText,
    },
    {
      id: "counsel",
      label: "복용 안내 초안",
      text: counselText,
    },
  ];
}

export function buildPharmCopilotSummary(input: {
  order: OrderAccordionOrder;
  messages: OrderMessage[];
}): PharmCopilotSummary {
  const priority = buildPriority(input);

  return {
    priorityLabel: priority.label,
    priorityTone: priority.tone,
    overview: buildOverview(input.order),
    priorityReasons: priority.reasons,
    cautionLines: buildCautionLines(input.order, input.messages),
    counselHighlights: buildCounselHighlights(input.order),
    draftReplies: buildDraftReplies(input.order, input.messages),
  };
}
