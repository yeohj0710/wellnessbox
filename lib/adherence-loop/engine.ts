import type { UserContextSummary } from "@/lib/chat/context";
import { resolveUsageCadence } from "@/lib/cadence-adjustment/engine";

export type AdherenceLoopSurface = "order-complete" | "my-data";
export type AdherenceLoopStage = "setup" | "check" | "adjust";

export type AdherenceLoopAction = {
  id: string;
  surface: AdherenceLoopSurface;
  stage: AdherenceLoopStage;
  title: string;
  description: string;
  helper: string;
  ctaLabel: string;
  draftPrompt: string;
  reasonLines: string[];
  anchorLabel: string;
  trackingLabel: string;
  milestoneLabel: string;
  elapsedDays: number;
  latestOrderAt: number;
  cadenceLabel: string;
  cadenceHelper: string;
};

type DateLike = string | number | Date | null | undefined;

type NormalizedOrderItem = {
  productName: string;
};

type NormalizedOrder = {
  orderedAt: number;
  items: NormalizedOrderItem[];
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

function daysSince(timestamp: number) {
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

function normalizeOrders(orders: unknown[] | null | undefined) {
  if (!Array.isArray(orders)) return [];

  return orders
    .map((entry) => {
      const order = asRecord(entry);
      if (!order) return null;

      const orderedAt = toTimestamp(order.createdAt as DateLike);
      if (!Number.isFinite(orderedAt)) return null;

      const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
      const parsedItems = orderItems
        .map((itemEntry) => {
          const item = asRecord(itemEntry);
          const pharmacyProduct = asRecord(item?.pharmacyProduct);
          const product = asRecord(pharmacyProduct?.product);
          const productName = asString(product?.name);
          if (!productName) return null;
          return { productName };
        })
        .filter((item): item is NormalizedOrderItem => item !== null);

      const fallbackItems = Array.isArray(order.items) ? order.items : [];
      const items =
        parsedItems.length > 0
          ? parsedItems
          : fallbackItems
              .map((itemEntry) => {
                const item = asRecord(itemEntry);
                const productName = asString(item?.name);
                if (!productName) return null;
                return { productName };
              })
              .filter((item): item is NormalizedOrderItem => item !== null);

      if (items.length === 0) return null;

      const status = asString(order.status);
      if (status.includes("취소")) return null;

      return {
        orderedAt,
        items,
      } satisfies NormalizedOrder;
    })
    .filter((order): order is NormalizedOrder => order !== null)
    .sort((left, right) => right.orderedAt - left.orderedAt);
}

function pickPrimaryFocus(summary: UserContextSummary | null) {
  return (
    summary?.profile?.goals[0] ||
    summary?.recommendedNutrients[0] ||
    summary?.latestAssess?.findings[0] ||
    summary?.latestQuick?.findings[0] ||
    "현재 목표"
  );
}

function resolveAnchorLabel(summary: UserContextSummary | null) {
  const goalText = `${summary?.profile?.goals.join(" ") || ""} ${
    summary?.recommendedNutrients.join(" ") || ""
  }`;
  if (/(수면|잠|스트레스|긴장|마그네슘)/.test(goalText)) {
    return "잠들기 전이나 저녁 같은 시간에 붙여 복용하기";
  }
  if (summary?.profile?.medications.length) {
    return "기존 복용 루틴 옆에 붙여 같은 시간대로 고정하기";
  }
  return "아침 식사 뒤 같은 시간에 붙여 복용하기";
}

function resolveTrackingLabel(summary: UserContextSummary | null) {
  const goalText = `${summary?.profile?.goals.join(" ") || ""} ${
    summary?.recommendedNutrients.join(" ") || ""
  }`;
  if (/(수면|잠)/.test(goalText)) {
    return "잠드는 시간과 아침 컨디션만 가볍게 체크하기";
  }
  if (/(피로|에너지|체력|집중|스트레스)/.test(goalText)) {
    return "오후 컨디션과 지침 정도만 짧게 기록하기";
  }
  return "하루 1줄로 복용 여부와 컨디션만 적기";
}

function resolveMilestoneLabel(
  stage: AdherenceLoopStage,
  elapsedDays: number,
  cadence: ReturnType<typeof resolveUsageCadence> | null
) {
  if (stage === "setup") {
    const remaining = Math.max(1, 7 - elapsedDays);
    return `${remaining}일만 같은 시간대를 지키면 복용 리듬이 훨씬 안정돼요`;
  }
  if (stage === "check") {
    const checkDay = cadence?.nextCheckDay ?? 14;
    const remaining = Math.max(1, checkDay - elapsedDays);
    return `${remaining}일 안에 체감 포인트 1~2개만 확인해도 내 리듬을 더 정확히 읽을 수 있어요`;
  }
  return "지금은 더 자주 기록하기보다 조정할 포인트 1~2개만 좁혀 보는 구간이에요";
}

function buildDraftPrompt(
  stage: AdherenceLoopStage,
  summary: UserContextSummary | null,
  cadence: ReturnType<typeof resolveUsageCadence> | null
) {
  const focus = pickPrimaryFocus(summary);
  const cadenceGuide =
    cadence?.state === "slowing"
      ? "최근엔 조금 천천히 이어지는 흐름도 반영해"
      : cadence?.state === "drifting"
      ? "예전 주기와 달라진 흐름도 고려해"
      : "지금 복용 리듬을 기준으로";

  if (stage === "setup") {
    return `최근 주문과 ${focus} 목표를 바탕으로 ${cadenceGuide} 14일 복용 루틴을 아주 가볍게 유지하는 방법과 실천 팁 1가지만 정리해줘.`;
  }
  if (stage === "check") {
    return `최근 주문과 ${focus} 목표를 바탕으로 ${cadenceGuide} 이번 주에 체크할 체감 포인트 2개와 기록 예시를 과장 없이 정리해줘.`;
  }
  return `최근 주문, 검사, 상담 기록을 바탕으로 ${cadenceGuide} 계속 유지할 점 1개와 약사에게 조정 상담으로 물어볼 포인트 2개를 정리해줘.`;
}

function buildReasonLines(
  stage: AdherenceLoopStage,
  elapsedDays: number,
  summary: UserContextSummary | null,
  latestOrder: NormalizedOrder,
  cadence: ReturnType<typeof resolveUsageCadence> | null
) {
  const lines = [
    `주문 후 ${elapsedDays}일째라 지금은 재구매보다 복용 리듬을 읽는 쪽이 더 중요해요.`,
  ];

  if (latestOrder.items[0]?.productName) {
    lines.push(`최근 주문한 ${latestOrder.items[0].productName} 구성을 기준으로 지금 단계에 맞는 follow-up을 잡았어요.`);
  }

  if (cadence?.reasonLines[2]) {
    lines.push(cadence.reasonLines[2]);
  } else if (stage === "setup") {
    lines.push("초기 1주에 같은 시간대를 붙여 두면 이후 체감과 리필 간격이 훨씬 안정돼요.");
  } else if (stage === "check") {
    lines.push("중간 구간에는 길게 적기보다 체감 포인트 1~2개만 좁혀 보는 편이 덜 귀찮고 더 정확해요.");
  } else {
    lines.push(
      summary?.explainability.pharmacistReviewPoints[0] ||
        "지금은 날짜를 무리하게 맞추기보다 유지·조정 포인트를 짧게 확인하는 편이 더 안전해요."
    );
  }

  return lines.slice(0, 3);
}

export function resolveAdherenceLoopAction(input: {
  surface: AdherenceLoopSurface;
  orders: unknown[] | null | undefined;
  summary?: UserContextSummary | null;
}): AdherenceLoopAction | null {
  const orders = normalizeOrders(input.orders);
  const latestOrder = orders[0];
  if (!latestOrder) return null;

  const elapsedDays = daysSince(latestOrder.orderedAt);
  if (input.surface === "my-data" && elapsedDays > 35) {
    return null;
  }

  const cadence =
    resolveUsageCadence({
      orders: input.orders,
      summary: input.summary ?? null,
    }) ?? null;

  const risky =
    input.summary?.healthLink?.riskLevel === "high" ||
    input.summary?.healthLink?.riskLevel === "medium" ||
    (input.summary?.profile?.medications.length ?? 0) > 0 ||
    input.summary?.notableResponses.some((item) => item.signal === "주의");

  const checkStageBoundary = cadence?.shouldExtendCheckWindow
    ? Math.max(21, cadence.nextCheckDay ?? 21)
    : 21;

  const stage: AdherenceLoopStage =
    elapsedDays < 7
      ? "setup"
      : elapsedDays < checkStageBoundary && cadence?.state !== "drifting"
      ? "check"
      : "adjust";

  const anchorLabel = resolveAnchorLabel(input.summary ?? null);
  const trackingLabel = resolveTrackingLabel(input.summary ?? null);
  const milestoneLabel = resolveMilestoneLabel(stage, elapsedDays, cadence);

  const title =
    stage === "setup"
      ? "먹기 시작한 지금은 복용 시간을 먼저 붙이는 쪽이 가장 중요해요"
      : stage === "check"
      ? cadence?.state === "slowing"
        ? "조금 천천히 이어지는 리듬이라 지금은 조정보다 체감 체크를 더 길게 가져가도 괜찮아요"
        : "지금은 많이 기록하기보다 체감 포인트 1~2개만 확인하는 시점이에요"
      : risky
      ? "구성을 늘리기보다 유지·조정 포인트를 약사와 함께 좁혀보는 편이 좋아요"
      : "이제는 계속 유지할 점과 다음 조정 포인트를 가볍게 정리할 때예요";

  const description =
    stage === "setup"
      ? "복용 직후 1주는 소비 속도보다 같은 시간대에 붙는 습관이 먼저예요. 초반 루틴이 잡히면 이후 체감과 리필 cadence도 더 안정적으로 읽혀요."
      : stage === "check"
      ? cadence?.state === "slowing"
        ? "최근엔 조금 천천히 이어지는 흐름이라 빨리 결론 내리기보다 체감 포인트를 조금 더 가볍게, 조금 더 길게 보는 편이 자연스러워요."
        : "중간 구간에는 기록을 길게 쌓기보다 체감 여부를 짧게 확인하는 편이 덜 귀찮고 더 꾸준히 이어져요."
      : risky
      ? "최근 건강·복용 맥락을 보면 무작정 속도를 올리거나 바꾸기보다 현재 루틴을 점검하면서 약사와 조정 포인트를 정리하는 편이 더 안전해요."
      : "유지할 점과 바꿔볼 점을 짧게 정리해 두면 다음 추천과 재구매 timing도 내 리듬에 더 잘 맞게 조정돼요.";

  const helper =
    stage === "setup"
      ? `루틴 힌트: ${anchorLabel}`
      : stage === "check"
      ? `체감 체크 힌트: ${trackingLabel}`
      : risky
      ? "약사 상담에서는 현재 복용 리듬과 최근 검사 방향을 함께 보여 주면서 조정 포인트를 좁혀보면 좋아요."
      : "상담에서 최근 주문과 검사 맥락을 같이 말하면 다음 구성 조정이 훨씬 빠르게 맞춰져요.";

  const ctaLabel =
    stage === "setup"
      ? "2주 복용 루틴 받기"
      : stage === "check"
      ? "체감 체크 포인트 정리하기"
      : risky
      ? "약사와 조정 포인트 점검하기"
      : "다음 구성 조정 포인트 보기";

  return {
    id: `${input.surface}:${latestOrder.orderedAt}`,
    surface: input.surface,
    stage,
    title,
    description,
    helper,
    ctaLabel,
    draftPrompt: buildDraftPrompt(stage, input.summary ?? null, cadence),
    reasonLines: buildReasonLines(
      stage,
      elapsedDays,
      input.summary ?? null,
      latestOrder,
      cadence
    ),
    anchorLabel,
    trackingLabel,
    milestoneLabel,
    elapsedDays,
    latestOrderAt: latestOrder.orderedAt,
    cadenceLabel: cadence?.label ?? "지금 복용 리듬을 먼저 읽는 구간이에요",
    cadenceHelper:
      cadence?.headline ??
      "주기만 고정해서 밀기보다 최근 사용 속도와 반응을 함께 보고 follow-up 강도를 맞췄어요.",
  };
}
