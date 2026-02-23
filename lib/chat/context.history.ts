import type { ChatSession } from "@/types/chat";
import {
  clip,
  formatDate,
  parseDate,
  toPlainText,
  uniq,
} from "./context.base";
import type {
  ConsultationLike,
  MessageLike,
  OrderLike,
} from "./context.types";

function normalizeOrderItem(item: unknown): string | null {
  if (typeof item === "string") {
    const text = clip(item.trim(), 60);
    return text || null;
  }
  if (!item || typeof item !== "object") return null;

  const value = item as Record<string, unknown>;
  const nameRaw =
    (typeof value.name === "string" && value.name) ||
    (typeof value.productName === "string" && value.productName) ||
    (typeof value.label === "string" && value.label) ||
    (typeof value.title === "string" && value.title) ||
    (typeof value.sku === "string" && value.sku) ||
    (typeof (value.product as Record<string, unknown> | undefined)?.name ===
      "string" &&
      ((value.product as Record<string, unknown>).name as string)) ||
    (typeof (
      (value.pharmacyProduct as Record<string, unknown> | undefined)?.product as
        | Record<string, unknown>
        | undefined
    )?.name === "string" &&
      (((value.pharmacyProduct as Record<string, unknown>).product as Record<
        string,
        unknown
      >).name as string)) ||
    "";

  const quantityRaw = value.quantity ?? value.qty;
  const quantity =
    typeof quantityRaw === "number"
      ? quantityRaw
      : typeof quantityRaw === "string" && quantityRaw.trim()
      ? Number.parseFloat(quantityRaw)
      : NaN;

  const name = clip(nameRaw.trim(), 44);
  if (!name) return null;
  if (Number.isFinite(quantity) && quantity > 0) {
    return `${name} x${quantity}`;
  }
  return name;
}

export function buildRecentOrders(orders: OrderLike[] | null | undefined) {
  if (!Array.isArray(orders)) return [];

  const sorted = [...orders].sort((left, right) => {
    const l = parseDate(left.createdAt || left.updatedAt)?.getTime() || 0;
    const r = parseDate(right.createdAt || right.updatedAt)?.getTime() || 0;
    return r - l;
  });

  return sorted.slice(0, 3).map((order) => {
    const sourceItems =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : Array.isArray(order.orderItems)
        ? order.orderItems
        : [];

    const items = uniq(
      sourceItems
        .map(normalizeOrderItem)
        .filter((value): value is string => Boolean(value)),
      4
    );

    return {
      orderedAt: formatDate(order.createdAt || order.updatedAt),
      status:
        typeof order.status === "string" && order.status.trim()
          ? order.status.trim()
          : "상태 미상",
      items: items.length ? items : ["상품 정보 없음"],
    };
  });
}

function findLastMessage(messages: MessageLike[] | undefined, role: "user" | "assistant") {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== role) continue;
    const text = clip(toPlainText(message.content).replace(/\s+/g, " ").trim(), 90);
    if (text) return text;
  }
  return "";
}

export function buildPreviousConsultations(
  sessions: ConsultationLike[] | ChatSession[] | null | undefined,
  currentSessionId?: string | null
) {
  if (!Array.isArray(sessions)) return [];

  const normalized = sessions
    .filter((session) => {
      if (!session) return false;
      if (currentSessionId && session.id === currentSessionId) return false;
      return true;
    })
    .sort((left, right) => {
      const l = parseDate(left.updatedAt)?.getTime() || 0;
      const r = parseDate(right.updatedAt)?.getTime() || 0;
      return r - l;
    })
    .slice(0, 3)
    .map((session) => {
      const title =
        typeof session.title === "string" && session.title.trim()
          ? clip(session.title.trim(), 30)
          : "상담";
      const userPoint = findLastMessage(session.messages as MessageLike[] | undefined, "user");
      const assistantPoint = findLastMessage(
        session.messages as MessageLike[] | undefined,
        "assistant"
      );

      return {
        title,
        updatedAt: formatDate(session.updatedAt),
        userPoint,
        assistantPoint,
      };
    })
    .filter((session) => session.userPoint || session.assistantPoint);

  return normalized;
}
