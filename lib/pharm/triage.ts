import { ORDER_STATUS } from "@/lib/order/orderStatus";
import type {
  OrderAccordionOrder,
  OrderMessage,
} from "@/components/order/orderAccordion.types";

export type PharmOrderTriageTone = "urgent" | "attention" | "normal";

export type PharmOrderTriage = {
  score: number;
  tone: PharmOrderTriageTone;
  toneLabel: string;
  nextActionLabel: string;
  nextActionDescription: string;
  badges: string[];
  checklist: string[];
  missingSignals: string[];
};

export type PharmInboxTriageSummary = {
  urgentCount: number;
  replyCount: number;
  staleCount: number;
  missingCount: number;
  requestCount: number;
  headline: string;
  summary: string;
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

function getMessages(order: OrderAccordionOrder, messages?: OrderMessage[]) {
  const source = Array.isArray(messages)
    ? messages
    : Array.isArray(order.messagesPreview)
      ? order.messagesPreview
      : [];

  return [...source].sort((left, right) => left.timestamp - right.timestamp);
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

function hasSpecialRequest(order: OrderAccordionOrder) {
  return Boolean(
    compactText(order.requestNotes) ||
      compactText(order.directions) ||
      compactText(order.entrancePassword)
  );
}

function hasCounselGuidance(messages: OrderMessage[]) {
  return messages.some((message) => {
    if (typeof message.pharmacyId !== "number") return false;
    const text = compactText(message.content, 300).toLowerCase();
    if (!text) return false;
    return (
      text.includes("복용") ||
      text.includes("복약") ||
      text.includes("식후") ||
      text.includes("식전") ||
      text.includes("아침") ||
      text.includes("저녁") ||
      text.includes("시간대") ||
      text.includes("주의") ||
      text.length >= 55
    );
  });
}

function hasMixedCategories(order: OrderAccordionOrder) {
  const categories = order.orderItems.flatMap((item) =>
    item.pharmacyProduct?.product?.categories
      ?.map((category) => compactText(category.name || "", 40))
      .filter(Boolean) || []
  );

  return new Set(categories).size >= 2;
}

export function buildPharmOrderTriage(input: {
  order: OrderAccordionOrder;
  messages?: OrderMessage[];
}): PharmOrderTriage {
  const { order } = input;
  const messages = getMessages(order, input.messages);
  const ageHours = hoursSince(order.createdAt);
  const waitingForReply = hasCustomerWaiting(messages);
  const specialRequest = hasSpecialRequest(order);
  const mixedCategories = hasMixedCategories(order);
  const hasAnyPharmacyMessage = messages.some(
    (message) => typeof message.pharmacyId === "number"
  );
  const hasCounselMessage = hasCounselGuidance(messages);

  const checklist: string[] = [];
  const missingSignals: string[] = [];
  const badges: string[] = [];
  let score = 0;
  let nextActionLabel = "일반 검토";
  let nextActionDescription = "주문 정보와 복용 안내를 순서대로 확인하면 돼요.";

  if (waitingForReply) {
    score += 6;
    badges.push("고객 답변 필요");
    checklist.push("고객 마지막 메시지에 먼저 답변하기");
    missingSignals.push("고객 질문이 남아 있는데 아직 약국 답변이 없어요.");
    nextActionLabel = "고객 메시지 답변";
    nextActionDescription = "가장 최근 고객 메시지부터 답변하고 필요한 추가 확인을 이어가세요.";
  }

  if (order.status === ORDER_STATUS.PAYMENT_COMPLETE && ageHours >= 6) {
    score += 4;
    badges.push("상담 지연");
    checklist.push("지연된 접수/상담 시작 안내 보내기");
    missingSignals.push(`결제 완료 후 ${ageHours}시간이 지나 상담이 멈춰 있어요.`);
    if (!waitingForReply) {
      nextActionLabel = "접수/상담 재개";
      nextActionDescription = "상담 대기가 길어진 주문이라 접수 안내나 확인 질문을 먼저 보내는 편이 좋아요.";
    }
  }

  if (!hasAnyPharmacyMessage && ageHours >= 2) {
    score += 3;
    badges.push("첫 응답 전");
    checklist.push("첫 접수 안내 보내기");
    missingSignals.push("약국에서 보낸 첫 메시지가 아직 없어요.");
    if (!waitingForReply && order.status === ORDER_STATUS.PAYMENT_COMPLETE) {
      nextActionLabel = "첫 응답 보내기";
      nextActionDescription = "접수 안내로 기다림을 줄이고 필요한 확인 질문을 함께 여는 것이 좋아요.";
    }
  }

  if (specialRequest) {
    score += 2;
    badges.push("요청 확인");
    checklist.push("배송/수령 요청사항 다시 확인하기");
    missingSignals.push("배송이나 수령 관련 요청이 있어 놓치면 재문의로 이어질 수 있어요.");
    if (!waitingForReply && order.status !== ORDER_STATUS.CANCELED) {
      nextActionLabel = "요청사항 확인";
      nextActionDescription = "주소, 길 안내, 공동현관 정보 같은 수령 조건을 먼저 확인하세요.";
    }
  }

  if (mixedCategories && !hasCounselMessage) {
    score += 2;
    badges.push("복용 안내 필요");
    checklist.push("복용 순서와 중복 주의 짚어주기");
    missingSignals.push("복용 순서나 중복 주의 안내가 아직 메시지에 보이지 않아요.");
    if (!waitingForReply) {
      nextActionLabel = "복용 안내 점검";
      nextActionDescription = "카테고리가 섞인 구성이라 복용 순서와 주의 포인트를 짧게 정리해 주세요.";
    }
  }

  if (checklist.length === 0) {
    checklist.push("주문 상태와 복용 안내를 순서대로 확인하기");
  }

  const tone: PharmOrderTriageTone =
    score >= 7 ? "urgent" : score >= 3 ? "attention" : "normal";
  const toneLabel =
    tone === "urgent" ? "우선 처리" : tone === "attention" ? "확인 필요" : "일반 검토";

  return {
    score,
    tone,
    toneLabel,
    nextActionLabel,
    nextActionDescription,
    badges: uniqueLines(badges, 3),
    checklist: uniqueLines(checklist, 3),
    missingSignals: uniqueLines(missingSignals, 3),
  };
}

export function compareOrdersByPharmTriage(
  left: OrderAccordionOrder,
  right: OrderAccordionOrder
) {
  const leftTriage = buildPharmOrderTriage({ order: left });
  const rightTriage = buildPharmOrderTriage({ order: right });

  if (leftTriage.score !== rightTriage.score) {
    return rightTriage.score - leftTriage.score;
  }

  const leftCreatedAt = toDate(left.createdAt)?.getTime() ?? 0;
  const rightCreatedAt = toDate(right.createdAt)?.getTime() ?? 0;
  return rightCreatedAt - leftCreatedAt;
}

export function buildPharmInboxTriageSummary(
  orders: OrderAccordionOrder[]
): PharmInboxTriageSummary {
  const triages = orders.map((order) => buildPharmOrderTriage({ order }));

  const urgentCount = triages.filter((triage) => triage.tone === "urgent").length;
  const replyCount = triages.filter((triage) =>
    triage.badges.includes("고객 답변 필요")
  ).length;
  const staleCount = triages.filter((triage) =>
    triage.badges.includes("상담 지연")
  ).length;
  const missingCount = triages.filter(
    (triage) => triage.missingSignals.length > 0
  ).length;
  const requestCount = triages.filter((triage) =>
    triage.badges.includes("요청 확인")
  ).length;

  let headline = "지금은 일반 검토 주문부터 차분히 보면 돼요.";
  if (replyCount > 0) {
    headline = `고객 답변이 밀린 주문 ${replyCount}건을 먼저 확인하세요.`;
  } else if (staleCount > 0) {
    headline = `상담이 오래 멈춘 주문 ${staleCount}건부터 재개하는 편이 좋아요.`;
  } else if (requestCount > 0) {
    headline = `배송/수령 요청이 있는 주문 ${requestCount}건을 놓치지 않게 먼저 보세요.`;
  }

  const summary = [
    urgentCount > 0 ? `우선 처리 ${urgentCount}건` : "",
    replyCount > 0 ? `고객 답변 필요 ${replyCount}건` : "",
    staleCount > 0 ? `상담 지연 ${staleCount}건` : "",
    requestCount > 0 ? `요청 확인 ${requestCount}건` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    urgentCount,
    replyCount,
    staleCount,
    missingCount,
    requestCount,
    headline,
    summary: summary || "현재 페이지 주문은 기본 검토 중심이에요.",
  };
}
