import type { UserContextSummary } from "@/lib/chat/context";
import { resolveUsageCadence } from "@/lib/cadence-adjustment/engine";

export type SmartRefillSurface = "my-data" | "orders";
export type SmartRefillStatus = "watch" | "due" | "overdue";
export type SmartRefillCtaType = "reorder" | "consult" | "explore";

export type SmartRefillBundleItem = {
  productName: string;
  optionType: string | null;
  quantity: number;
};

export type SmartRefillAction = {
  id: string;
  surface: SmartRefillSurface;
  status: SmartRefillStatus;
  intensity: "soft" | "medium" | "strong";
  ctaType: SmartRefillCtaType;
  title: string;
  description: string;
  helper: string;
  ctaLabel: string;
  href?: string;
  reasonLines: string[];
  bundleItems: SmartRefillBundleItem[];
  elapsedDays: number;
  targetDays: number;
  triggerDay: number;
  productName: string;
  optionType: string | null;
  cadenceLabel: string;
  cadenceHelper: string;
};

type DateLike = string | number | Date | null | undefined;

type NormalizedOrderItem = {
  productName: string;
  optionType: string | null;
  quantity: number;
};

type NormalizedOrder = {
  id: string;
  status: string;
  orderedAt: number;
  items: NormalizedOrderItem[];
};

type Candidate = {
  key: string;
  productName: string;
  optionType: string | null;
  latestOrder: NormalizedOrder;
  bundleItems: SmartRefillBundleItem[];
  elapsedDays: number;
  packageDays: number | null;
  observedIntervalDays: number | null;
  targetDays: number;
  triggerDay: number;
  status: SmartRefillStatus;
  repeatCount: number;
  score: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveInteger(value: unknown) {
  const parsed = asNumber(value);
  if (parsed == null || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
}

function toTimestamp(value: DateLike) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function daysBetween(laterMs: number, earlierMs: number) {
  return Math.max(0, Math.floor((laterMs - earlierMs) / (1000 * 60 * 60 * 24)));
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extractSupplyDays(optionType: string | null) {
  const text = (optionType || "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const monthMatch = text.match(/(\d+(?:\.\d+)?)\s*개월/);
  if (monthMatch) {
    const parsed = Number.parseFloat(monthMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 30);
    }
  }

  const dayMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:일|day|days)/i);
  if (dayMatch) {
    const parsed = Number.parseFloat(dayMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  const unitMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:캡슐|정)/);
  if (unitMatch) {
    const parsed = Number.parseFloat(unitMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 180) {
      return Math.round(parsed);
    }
  }

  return null;
}

function parseOrderItems(rawOrder: Record<string, unknown>): NormalizedOrderItem[] {
  const orderItems = Array.isArray(rawOrder.orderItems) ? rawOrder.orderItems : [];
  const parsedFromOrderItems = orderItems
    .map((entry) => {
      const item = asRecord(entry);
      const pharmacyProduct = asRecord(item?.pharmacyProduct);
      const product = asRecord(pharmacyProduct?.product);
      const productName = asString(product?.name);
      if (!productName) return null;
      return {
        productName,
        optionType: asString(pharmacyProduct?.optionType) || null,
        quantity: toPositiveInteger(item?.quantity),
      };
    })
    .filter((item): item is NormalizedOrderItem => item !== null);

  if (parsedFromOrderItems.length > 0) return parsedFromOrderItems;

  const fallbackItems = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  return fallbackItems
    .map((entry) => {
      const item = asRecord(entry);
      const productName = asString(item?.name);
      if (!productName) return null;
      return {
        productName,
        optionType: asString(item?.optionType) || null,
        quantity: toPositiveInteger(item?.quantity),
      };
    })
    .filter((item): item is NormalizedOrderItem => item !== null);
}

function isCanceledOrder(status: string) {
  return status.includes("취소");
}

function normalizeOrders(orders: unknown[] | null | undefined) {
  if (!Array.isArray(orders)) return [];

  return orders
    .map((entry) => {
      const order = asRecord(entry);
      if (!order) return null;

      const orderedAt = toTimestamp(order.createdAt as DateLike);
      if (!Number.isFinite(orderedAt)) return null;

      const items = parseOrderItems(order);
      if (items.length === 0) return null;

      const status = asString(order.status);
      if (isCanceledOrder(status)) return null;

      return {
        id: asString(order.id) || String(order.id ?? orderedAt),
        status,
        orderedAt,
        items,
      } satisfies NormalizedOrder;
    })
    .filter((order): order is NormalizedOrder => order !== null)
    .sort((left, right) => right.orderedAt - left.orderedAt);
}

function buildCandidates(orders: NormalizedOrder[]): Candidate[] {
  const now = Date.now();
  const grouped = new Map<
    string,
    {
      productName: string;
      optionType: string | null;
      orders: NormalizedOrder[];
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const key = `${normalizeKey(item.productName)}:${normalizeKey(item.optionType || "")}`;
      const existing = grouped.get(key);
      if (existing) {
        if (!existing.orders.some((candidateOrder) => candidateOrder.id === order.id)) {
          existing.orders.push(order);
        }
        continue;
      }

      grouped.set(key, {
        productName: item.productName,
        optionType: item.optionType,
        orders: [order],
      });
    }
  }

  const candidates: Candidate[] = [];

  for (const [key, group] of grouped.entries()) {
    const sortedOrders = [...group.orders].sort(
      (left, right) => right.orderedAt - left.orderedAt
    );
    const latestOrder = sortedOrders[0];
    if (!latestOrder) continue;

    const orderDates = sortedOrders.map((order) => order.orderedAt);
    const intervals = orderDates
      .slice(0, -1)
      .map((timestamp, index) => daysBetween(timestamp, orderDates[index + 1]))
      .filter((value) => value >= 5 && value <= 180);
    const observedIntervalDays = median(intervals);
    const packageDays = extractSupplyDays(group.optionType);
    const targetDaysRaw =
      observedIntervalDays != null && packageDays != null
        ? Math.round(observedIntervalDays * 0.6 + packageDays * 0.4)
        : observedIntervalDays ?? packageDays ?? null;

    if (targetDaysRaw == null || targetDaysRaw < 5) continue;

    const targetDays = clamp(targetDaysRaw, 5, 120);
    const leadDays = clamp(Math.round(targetDays * 0.18), 3, 10);
    const triggerDay = Math.max(1, targetDays - leadDays);
    const elapsedDays = daysBetween(now, latestOrder.orderedAt);

    let status: SmartRefillStatus = "watch";
    if (elapsedDays >= targetDays + 5) {
      status = "overdue";
    } else if (elapsedDays >= triggerDay) {
      status = "due";
    }

    const confidenceBonus =
      intervals.length >= 2 ? 10 : intervals.length === 1 ? 6 : packageDays ? 3 : 0;
    const urgencyBonus =
      status === "overdue"
        ? 100 + Math.min(20, elapsedDays - targetDays)
        : status === "due"
        ? 70 + Math.min(10, elapsedDays - triggerDay)
        : 0;
    const score = urgencyBonus + sortedOrders.length * 4 + confidenceBonus;

    candidates.push({
      key,
      productName: group.productName,
      optionType: group.optionType,
      latestOrder,
      bundleItems: latestOrder.items.map((item) => ({
        productName: item.productName,
        optionType: item.optionType,
        quantity: item.quantity,
      })),
      elapsedDays,
      packageDays,
      observedIntervalDays,
      targetDays,
      triggerDay,
      status,
      repeatCount: sortedOrders.length,
      score,
    });
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function hasRecentConsultation(summary: UserContextSummary | null, withinDays = 35) {
  const latest = summary?.previousConsultations?.[0]?.updatedAt;
  const timestamp = toTimestamp(latest);
  if (!Number.isFinite(timestamp)) return false;
  return daysBetween(Date.now(), timestamp) <= withinDays;
}

function isConsultFirst(summary: UserContextSummary | null) {
  if (!summary) return false;
  if (summary.safetyEscalation.level !== "routine") {
    return !hasRecentConsultation(summary);
  }

  const hasMedicationContext =
    (summary.profile?.medications.length ?? 0) > 0 ||
    (summary.healthLink?.topMedicines.length ?? 0) > 0;
  const hasConditionContext =
    (summary.profile?.conditions.length ?? 0) > 0 ||
    (summary.healthLink?.topConditions.length ?? 0) > 0;
  const hasCautionSignals = summary.notableResponses.some(
    (item) => item.signal === "주의"
  );

  const risky =
    summary.healthLink?.riskLevel === "high" ||
    summary.healthLink?.riskLevel === "medium" ||
    hasMedicationContext ||
    hasConditionContext ||
    hasCautionSignals;

  return risky && !hasRecentConsultation(summary);
}

function buildReasonLines(
  candidate: Candidate,
  summary: UserContextSummary | null,
  cadence: ReturnType<typeof resolveUsageCadence> | null
) {
  const lines = [
    `마지막 주문 후 ${candidate.elapsedDays}일이 지나 지금 cadence 기준 리필 구간에 가까워졌어요.`,
  ];

  if (cadence?.reasonLines[1]) {
    lines.push(cadence.reasonLines[1]);
  } else if (candidate.observedIntervalDays != null) {
    lines.push(`최근 반복 주문 간격은 약 ${candidate.observedIntervalDays}일로 읽혀요.`);
  } else if (candidate.packageDays != null) {
    lines.push(`${candidate.optionType || "이전 옵션"} 기준 사용 기간은 약 ${candidate.packageDays}일로 보고 있어요.`);
  }

  if (candidate.bundleItems.length > 1) {
    lines.push(`직전 주문이 ${candidate.bundleItems.length}개 구성이라 지난 조합을 한 번에 다시 이어갈 수 있어요.`);
  }

  if (cadence?.state === "slowing" || cadence?.state === "drifting" || cadence?.state === "paused") {
    lines.push(cadence.reasonLines[2] || cadence.headline);
  } else if (isConsultFirst(summary)) {
    lines.push(
      summary?.explainability.pharmacistReviewPoints[0] ||
        "복용약이나 건강 맥락이 있어 이번에는 약사 확인을 먼저 붙이는 편이 더 안전해요."
    );
  }

  return lines.slice(0, 3);
}

export function resolveSmartRefillAction(input: {
  surface: SmartRefillSurface;
  orders: unknown[] | null | undefined;
  summary?: UserContextSummary | null;
}): SmartRefillAction | null {
  const orders = normalizeOrders(input.orders);
  if (orders.length === 0) return null;

  const globalCadence = resolveUsageCadence({
    orders: input.orders,
    summary: input.summary ?? null,
  });

  const topCandidate = buildCandidates(orders)
    .map((candidate) => {
      const cadence =
        resolveUsageCadence({
          orders: input.orders,
          summary: input.summary ?? null,
          expectedDays: candidate.targetDays,
        }) ?? globalCadence;

      if (!cadence) return candidate;

      const adjustedTargetDays = clamp(candidate.targetDays + cadence.adjustmentDays, 5, 140);
      const leadDays = clamp(Math.round(adjustedTargetDays * 0.18), 3, 10);
      const adjustedTriggerDay = Math.max(1, adjustedTargetDays - leadDays);

      let adjustedStatus: SmartRefillStatus = "watch";
      if (candidate.elapsedDays >= adjustedTargetDays + 5) {
        adjustedStatus = "overdue";
      } else if (candidate.elapsedDays >= adjustedTriggerDay) {
        adjustedStatus = "due";
      }

      return {
        ...candidate,
        targetDays: adjustedTargetDays,
        triggerDay: adjustedTriggerDay,
        status: adjustedStatus,
      };
    })
    .find((candidate) => candidate.status === "due" || candidate.status === "overdue");

  if (!topCandidate) return null;

  const cadence =
    resolveUsageCadence({
      orders: input.orders,
      summary: input.summary ?? null,
      expectedDays: topCandidate.targetDays,
    }) ?? globalCadence;

  const consultFirst = isConsultFirst(input.summary ?? null) || cadence?.shouldPreferConsult;
  const longLapse =
    topCandidate.repeatCount <= 1 &&
    topCandidate.elapsedDays >= topCandidate.targetDays + 14;

  const ctaType: SmartRefillCtaType = consultFirst
    ? "consult"
    : longLapse || cadence?.shouldUseSoftRestart
    ? "explore"
    : "reorder";

  const intensity =
    topCandidate.status === "overdue"
      ? cadence?.state === "steady"
        ? "strong"
        : "medium"
      : consultFirst || ctaType === "reorder"
      ? "medium"
      : "soft";

  const title =
    ctaType === "consult"
      ? "지금은 다시 담기보다 약사와 한 번 더 맞춰보는 편이 좋아요"
      : ctaType === "explore"
      ? cadence?.state === "drifting"
        ? "예전 cadence대로 다시 사기보다 가볍게 재시작해 보는 흐름이 더 자연스러워요"
        : "오래 비었다면 7일치부터 가볍게 다시 시작해 보는 편이 부담이 적어요"
      : topCandidate.status === "overdue"
      ? cadence?.state === "slowing"
        ? `${topCandidate.productName}은 예전보다 천천히 쓰는 흐름이라 지금 다시 담을지 먼저 가볍게 점검해 볼 수 있어요`
        : `지금 ${topCandidate.productName} 구성을 다시 담기 좋은 시점이에요`
      : cadence?.state === "slowing"
      ? `${topCandidate.productName}은 조금 늦춰도 괜찮지만 지금부터 리필을 준비해 두면 매끄러워요`
      : `${topCandidate.productName} 리필을 미리 이어가기 좋은 구간이에요`;

  const description =
    ctaType === "consult"
      ? "주기만 보면 리필 타이밍에 가까워도, 최근 상담·복용·건강 맥락을 보면 같은 cadence를 그대로 밀기보다 한 번 더 확인하고 가는 편이 더 안전해요."
      : ctaType === "explore"
      ? cadence?.state === "drifting"
        ? "최근 사용 간격이 예전과 달라져 같은 번들을 바로 반복하는 것보다 7일치 재진입이나 다시 맞춤 탐색으로 들어가는 편이 더 잘 맞을 수 있어요."
        : "마지막 주문 이후 공백이 길다면 예전 구성을 통째로 반복하기보다 부담이 적은 시작점으로 다시 붙는 편이 더 자연스러워요."
      : cadence?.state === "slowing"
      ? "이전보다 천천히 쓰는 흐름이 보여 예상 리필일을 조금 늦춰 읽고 있어요. 다만 지금부터 준비해 두면 끊김 없이 이어가기 쉬워요."
      : "최근 주문 간격과 옵션 구성을 함께 보면 지금이 가장 자연스럽게 다음 재구매로 이어지기 쉬운 구간이에요.";

  const helper =
    ctaType === "consult"
      ? "최근 cadence를 다시 맞추는 중이라면 재주문보다 조정 포인트를 먼저 정리하는 편이 더 잘 맞아요."
      : ctaType === "explore"
      ? "지금 리듬이 흔들리는 편이면 다시 맞춰 보기 쉬운 7일치나 탐색 재진입이 전환 부담을 줄여줘요."
      : cadence?.state === "slowing"
      ? "예전 cadence를 그대로 강하게 밀지 않고, 조금 늦춘 예상일 기준으로 리필 타이밍을 맞췄어요."
      : "지난 구성 그대로 장바구니에 바로 이어서 흐름을 짧게 만들었어요.";

  const ctaLabel =
    ctaType === "consult"
      ? "약사와 먼저 점검하기"
      : ctaType === "explore"
      ? "7일치부터 다시 보기"
      : "지난 구성 다시 담기";

  const href =
    ctaType === "consult"
      ? `/chat?from=${input.surface === "my-data" ? "my-data" : "orders"}`
      : ctaType === "explore"
      ? "/?package=7#home-products"
      : undefined;

  return {
    id: `${input.surface}:${topCandidate.key}`,
    surface: input.surface,
    status: topCandidate.status,
    intensity,
    ctaType,
    title,
    description,
    helper,
    ctaLabel,
    href,
    reasonLines: buildReasonLines(topCandidate, input.summary ?? null, cadence ?? null),
    bundleItems: topCandidate.bundleItems,
    elapsedDays: topCandidate.elapsedDays,
    targetDays: topCandidate.targetDays,
    triggerDay: topCandidate.triggerDay,
    productName: topCandidate.productName,
    optionType: topCandidate.optionType,
    cadenceLabel: cadence?.label ?? "지금 cadence를 기준으로 다시 담는 흐름이에요",
    cadenceHelper:
      cadence?.headline ??
      "주문 간격과 최근 사용 흐름을 함께 읽어 가장 덜 부담스러운 리필 강도로 맞췄어요.",
  };
}
