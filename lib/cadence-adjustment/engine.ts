import type { UserContextSummary } from "@/lib/chat/context";

export type UsageCadenceState =
  | "settling"
  | "steady"
  | "slowing"
  | "drifting"
  | "paused";

export type UsageCadenceConfidence = "low" | "medium" | "high";

export type UsageCadenceModel = {
  state: UsageCadenceState;
  label: string;
  headline: string;
  helper: string;
  confidence: UsageCadenceConfidence;
  cadenceDays: number | null;
  currentGapDays: number;
  adjustmentDays: number;
  nextCheckDay: number | null;
  shouldMuteRefill: boolean;
  shouldPreferConsult: boolean;
  shouldUseSoftRestart: boolean;
  shouldExtendCheckWindow: boolean;
  reasonLines: string[];
};

type DateLike = string | number | Date | null | undefined;

type NormalizedOrder = {
  orderedAt: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function daysSince(value: string | null | undefined) {
  const parsed = toTimestamp(value);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return daysBetween(Date.now(), parsed);
}

function isCanceledOrder(status: string) {
  return status.includes("취소");
}

export function normalizeCadenceOrders(orders: unknown[] | null | undefined) {
  if (!Array.isArray(orders)) return [];

  return orders
    .map((entry) => {
      const order = asRecord(entry);
      if (!order) return null;

      const orderedAt = toTimestamp(order.createdAt as DateLike);
      if (!Number.isFinite(orderedAt)) return null;

      const status = asString(order.status);
      if (isCanceledOrder(status)) return null;

      return {
        orderedAt,
      } satisfies NormalizedOrder;
    })
    .filter((order): order is NormalizedOrder => order !== null)
    .sort((left, right) => right.orderedAt - left.orderedAt);
}

export function resolveUsageCadence(input: {
  orders: unknown[] | null | undefined;
  summary?: UserContextSummary | null;
  expectedDays?: number | null;
}) {
  const orders = normalizeCadenceOrders(input.orders);
  const latestOrder = orders[0];
  if (!latestOrder) return null;

  const intervals = orders
    .slice(0, -1)
    .map((order, index) => daysBetween(order.orderedAt, orders[index + 1]?.orderedAt ?? 0))
    .filter((value) => value >= 5 && value <= 180);
  const cadenceDays = input.expectedDays ?? median(intervals);
  const currentGapDays = daysBetween(Date.now(), latestOrder.orderedAt);
  const baselineDays =
    cadenceDays != null ? clamp(cadenceDays, 5, 120) : Math.max(14, currentGapDays);
  const intervalSpread =
    intervals.length >= 2 ? Math.max(...intervals) - Math.min(...intervals) : 0;
  const stableSpreadLimit = clamp(Math.round(baselineDays * 0.3), 4, 12);
  const recentConsultationDays = daysSince(
    input.summary?.previousConsultations?.[0]?.updatedAt
  );
  const hasRecentConsultation = recentConsultationDays <= 21;
  const medicationCount =
    (input.summary?.profile?.medications.length ?? 0) +
    (input.summary?.healthLink?.topMedicines.length ?? 0);
  const conditionCount =
    (input.summary?.profile?.conditions.length ?? 0) +
    (input.summary?.healthLink?.topConditions.length ?? 0);
  const hasSafetySignals =
    input.summary?.safetyEscalation.level !== "routine" ||
    input.summary?.healthLink?.riskLevel === "medium" ||
    input.summary?.healthLink?.riskLevel === "high" ||
    medicationCount > 0 ||
    conditionCount > 0 ||
    input.summary?.notableResponses.some((item) => item.signal === "주의");

  const hasStableHistory = intervals.length >= 2 && intervalSpread <= stableSpreadLimit;
  const slowingThreshold = baselineDays + clamp(Math.round(baselineDays * 0.18), 4, 10);
  const driftingThreshold = baselineDays + clamp(Math.round(baselineDays * 0.4), 10, 24);
  const settlingThreshold = Math.max(10, Math.round(baselineDays * 0.45));
  const consultTuning =
    hasRecentConsultation &&
    (hasSafetySignals || currentGapDays <= Math.max(18, Math.round(baselineDays * 0.7)));

  let state: UsageCadenceState;
  if (consultTuning) {
    state = "paused";
  } else if (currentGapDays <= settlingThreshold && intervals.length < 2) {
    state = "settling";
  } else if (currentGapDays >= driftingThreshold || intervalSpread > stableSpreadLimit + 8) {
    state = "drifting";
  } else if (currentGapDays >= slowingThreshold) {
    state = "slowing";
  } else if (hasStableHistory || Math.abs(currentGapDays - baselineDays) <= 6) {
    state = "steady";
  } else {
    state = "settling";
  }

  const confidence: UsageCadenceConfidence =
    intervals.length >= 2 ? "high" : intervals.length === 1 ? "medium" : "low";

  const adjustmentDays =
    state === "steady"
      ? 0
      : state === "settling"
      ? 4
      : state === "slowing"
      ? 7
      : state === "drifting"
      ? 12
      : 10;

  const label =
    state === "steady"
      ? "리듬이 안정적이에요"
      : state === "settling"
      ? "아직 리듬을 맞추는 중이에요"
      : state === "slowing"
      ? "최근엔 조금 천천히 이어지고 있어요"
      : state === "drifting"
      ? "예전 주기를 그대로 밀기엔 간격이 흔들리고 있어요"
      : "최근 상담 기준으로 리듬을 다시 맞추는 중이에요";

  const headline =
    state === "steady"
      ? "지금은 기존 cadence를 거의 그대로 따라가도 괜찮아요"
      : state === "settling"
      ? "막 시작한 흐름이라 리필보다 루틴 고정이 먼저예요"
      : state === "slowing"
      ? "예전보다 늦게 쓰고 있어 리필 신호를 조금 늦춰 보는 편이 자연스러워요"
      : state === "drifting"
      ? "같은 주기로 다시 사라고 밀기보다 가볍게 재시작할지 점검하는 쪽이 맞아요"
      : "최근 상담과 주의 맥락이 있어 재구매보다 점검 메시지를 먼저 두는 편이 안전해요";

  const helper =
    state === "steady"
      ? "반복 간격이 비교적 일정해서 리필·후속 안내를 강하게 줄이지 않아도 돼요."
      : state === "settling"
      ? "초기 1~2주는 소비 속도보다 복용 습관을 붙이는 쪽이 반응과 만족에 더 좋아요."
      : state === "slowing"
      ? "조금 늦게 쓰는 흐름이면 예전 예상일에 바로 재구매를 밀지 않고 한 템포 쉬는 편이 덜 부담돼요."
      : state === "drifting"
      ? "휴면 조짐이나 간격 흔들림이 보이면 같은 번들 반복보다 7일치·상담 재진입이 더 잘 맞아요."
      : "최근 상담으로 구성이나 복용 리듬을 조정하는 중이면 리필 신호를 잠시 줄이는 편이 더 자연스러워요.";

  const reasonLines = [
    `최근 주문 간격 기준 cadence는 약 ${baselineDays}일로 읽히고 있어요.`,
  ];

  if (intervals.length > 0) {
    reasonLines.push(`직전 사용 간격은 ${intervals[0]}일이었고 지금은 ${currentGapDays}일째예요.`);
  } else {
    reasonLines.push(`아직 반복 주문이 적어서 최근 ${currentGapDays}일 흐름을 더 보수적으로 읽고 있어요.`);
  }

  if (state === "slowing") {
    reasonLines.push("조금 늦게 이어지는 패턴이라 재구매 신호를 바로 세게 밀지 않도록 조정했어요.");
  } else if (state === "drifting") {
    reasonLines.push("간격 흔들림이 보여 같은 주기 반복보다 재시작·재정렬 경로를 더 우선해요.");
  } else if (state === "paused") {
    reasonLines.push("최근 상담 또는 주의 맥락이 있어 지금은 리필보다 점검 쪽으로 강도를 낮췄어요.");
  } else if (state === "settling") {
    reasonLines.push("아직 내 리듬이 굳지 않은 구간이라 초반 알림과 리필 압박을 줄였어요.");
  }

  return {
    state,
    label,
    headline,
    helper,
    confidence,
    cadenceDays: baselineDays,
    currentGapDays,
    adjustmentDays,
    nextCheckDay:
      state === "steady"
        ? Math.max(7, baselineDays - 6)
        : state === "slowing"
        ? Math.max(9, baselineDays - 3)
        : state === "drifting"
        ? Math.max(10, baselineDays)
        : Math.max(7, Math.round(baselineDays * 0.7)),
    shouldMuteRefill: state === "settling" || state === "paused",
    shouldPreferConsult: state === "paused",
    shouldUseSoftRestart: state === "drifting",
    shouldExtendCheckWindow: state === "slowing" || state === "settling",
    reasonLines: reasonLines.slice(0, 3),
  } satisfies UsageCadenceModel;
}
