import { ORDER_STATUS, type OrderStatus } from "./orderStatus";

export type DeliveryExperienceOrderInput = {
  id?: number;
  status: OrderStatus | string | null;
  createdAt: string | number | Date;
  requestNotes?: string | null;
  entrancePassword?: string | null;
  directions?: string | null;
  orderItems?:
    | Array<{
        pharmacyProduct?: {
          optionType?: string | null;
          product?: {
            name?: string | null;
            categories?: Array<{ name?: string | null } | null> | null;
          } | null;
        } | null;
      }>
    | null;
};

type DeliveryExperienceMessage = {
  pharmacyId: number | null;
  content?: string | null;
  timestamp?: number | null;
  createdAt?: string | null;
};

export type DeliveryExperienceCoachAction =
  | { kind: "none"; label: null }
  | { kind: "message"; label: string }
  | { kind: "link"; label: string; href: string };

export type DeliveryExperienceCoachModel = {
  tone: "sky" | "amber" | "emerald";
  badge: string;
  title: string;
  summary: string;
  expectationLines: string[];
  firstExperienceLines: string[];
  reassuranceLines: string[];
  helper: string;
  primaryAction: DeliveryExperienceCoachAction;
};

function normalizeOrderStatus(value: OrderStatus | string | null | undefined): OrderStatus {
  if (
    typeof value === "string" &&
    (Object.values(ORDER_STATUS) as string[]).includes(value)
  ) {
    return value as OrderStatus;
  }

  return ORDER_STATUS.PAYMENT_COMPLETE;
}

type BuildDeliveryExperienceInput = {
  order: DeliveryExperienceOrderInput;
  messages?: DeliveryExperienceMessage[];
  surface: "order-complete" | "my-orders";
};

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function parseOptionDays(optionType: string | null | undefined) {
  const text = normalizeText(optionType);
  if (!text) return null;
  const match = text.match(/(\d+)\s*일/);
  if (match) return Number.parseInt(match[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function toDate(value: string | number | Date | null | undefined) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatElapsed(date: Date | null, now: Date) {
  if (!date) return null;
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}분`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일`;
}

function getPrimaryThemes(order: DeliveryExperienceOrderInput) {
  return uniqueStrings(
    (order.orderItems || []).flatMap((item) =>
      ((item.pharmacyProduct?.product?.categories || []) as Array<{
        name?: string | null;
      } | null>)
        .map((category) => normalizeText(category?.name))
        .filter(Boolean)
    ),
    3
  );
}

function getHasLongPackage(order: DeliveryExperienceOrderInput) {
  return (order.orderItems || []).some((item) => {
    const days = parseOptionDays(item.pharmacyProduct?.optionType);
    return typeof days === "number" && days >= 30;
  });
}

function extractPharmacyGuide(messages: DeliveryExperienceMessage[] = []) {
  const pharmacyMessages = messages
    .filter((message) => message.pharmacyId != null)
    .map((message) => normalizeText(message.content))
    .filter(Boolean);

  const hasUsageGuide = pharmacyMessages.some((message) =>
    /(복용|식전|식후|아침|저녁|취침|하루|간격|보관|냉장|시간)/.test(message)
  );

  const latestGuide =
    pharmacyMessages.find((message) =>
      /(복용|식전|식후|아침|저녁|취침|하루|간격|보관|냉장|시간)/.test(message)
    ) || "";

  return {
    hasUsageGuide,
    latestGuide,
  };
}

function hasDeliveryContext(order: DeliveryExperienceOrderInput) {
  return Boolean(
    normalizeText(order.requestNotes) ||
      normalizeText(order.entrancePassword) ||
      normalizeText(order.directions)
  );
}

function buildPrimaryAction(input: {
  surface: "order-complete" | "my-orders";
  status: OrderStatus;
  hasGuide: boolean;
}) {
  if (input.surface === "my-orders" && input.status === ORDER_STATUS.DELIVERY_COMPLETE) {
    return input.hasGuide
      ? ({ kind: "none", label: null } as const)
      : ({ kind: "message", label: "복용 전 질문 남기기" } as const);
  }

  if (input.surface === "my-orders") {
    return { kind: "message", label: "주문 메시지 열기" } as const;
  }

  return {
    kind: "link",
    label: "주문 진행과 안내 보기",
    href: "/my-orders",
  } as const;
}

export function buildDeliveryExperienceCoach(
  input: BuildDeliveryExperienceInput
): DeliveryExperienceCoachModel {
  const now = new Date();
  const status = normalizeOrderStatus(input.order.status);
  const orderDate = toDate(input.order.createdAt);
  const orderElapsed = formatElapsed(orderDate, now);
  const themes = getPrimaryThemes(input.order);
  const hasLongPackage = getHasLongPackage(input.order);
  const itemCount = input.order.orderItems?.length ?? 0;
  const guide = extractPharmacyGuide(input.messages);
  const deliveryPrepared = hasDeliveryContext(input.order);

  const commonFirstExperienceLines = uniqueStrings(
    [
      itemCount >= 2
        ? "처음부터 전부의 체감을 한 번에 보려 하기보다, 첫 3~4일은 복용 시간과 순서만 안정시키는 편이 덜 헷갈려요."
        : "처음 며칠은 효과 판단보다 같은 시간대에 붙여 복용 루틴을 만드는 쪽이 더 중요해요.",
      hasLongPackage
        ? "30일 구성이라도 초반에는 오래 버티겠다는 생각보다, 내 생활에 무리 없이 붙는지 먼저 보는 편이 좋아요."
        : "",
      guide.hasUsageGuide
        ? "이미 도착한 약사 안내가 있다면 그 문장을 기준으로 시작하고, 임의로 복용 방식을 넓게 바꾸지 않는 편이 안전해요."
        : "복용 시간이 헷갈리면 임의로 여러 방식으로 시도하기보다, 주문 메시지에 한 줄로 물어보고 시작하는 편이 더 깔끔해요.",
    ],
    3
  );

  if (
    status === ORDER_STATUS.PAYMENT_COMPLETE ||
    status === ORDER_STATUS.COUNSEL_COMPLETE
  ) {
    return {
      tone: "sky",
      badge: "도착 전 기대관리",
      title: "지금은 빨리 체감을 기대하기보다, 받았을 때 덜 헷갈리게 준비해 두는 구간이에요.",
      summary:
        "주문 직후에는 배송을 계속 확인하는 것보다 첫 복용 시간을 하나 정하고, 도착했을 때 무엇부터 볼지만 정리해 두는 편이 만족도가 더 좋아요.",
      expectationLines: uniqueStrings(
        [
          orderElapsed
            ? `주문 후 ${orderElapsed} 정도 지난 초기 구간이라 상태가 몇 번 더 바뀌는 과정은 자연스러워요.`
            : "",
          themes.length > 0
            ? `${themes.join(", ")} 목적이라도 받자마자 큰 변화를 바로 확인하려 하기보다, 첫 주는 루틴 적응 구간으로 보는 편이 좋아요.`
            : "도착 전에는 기대를 너무 높이기보다, 첫 주는 루틴 적응 구간이라고 생각하는 편이 덜 흔들려요.",
          "지금 마음이 급할수록 도착 직후 여러 제품을 한꺼번에 해석하려 하기 쉬워서, 미리 한 시간대만 정해두면 훨씬 덜 복잡해져요.",
        ],
        3
      ),
      firstExperienceLines: commonFirstExperienceLines,
      reassuranceLines: uniqueStrings(
        [
          "아직 조제·배송 전 단계라면 복용법을 확정해 외우기보다, 박스와 약사 안내를 받고 최종 확인하는 흐름이 자연스러워요.",
          deliveryPrepared
            ? "배송 메모가 이미 정리돼 있다면 수령 과정에서 다시 꼬일 가능성은 비교적 낮아요."
            : "배송 메모가 비어 있더라도 지금 당장 불안해하기보다, 필요할 때 한 번만 정리해서 남기는 편이 더 좋아요.",
        ],
        3
      ),
      helper:
        "배송을 기다리는 동안에는 정보를 계속 더 찾기보다, 첫 복용 시간 하나와 확인할 질문 하나만 남겨 두면 충분해요.",
      primaryAction: buildPrimaryAction({
        surface: input.surface,
        status,
        hasGuide: guide.hasUsageGuide,
      }),
    };
  }

  if (
    status === ORDER_STATUS.DISPENSE_COMPLETE ||
    status === ORDER_STATUS.PICKUP_COMPLETE
  ) {
    return {
      tone: status === ORDER_STATUS.PICKUP_COMPLETE ? "emerald" : "sky",
      badge:
        status === ORDER_STATUS.PICKUP_COMPLETE
          ? "도착 직전 준비"
          : "출고 전 정리",
      title: "이제 받았을 때 첫 경험이 깔끔하도록, 개봉 직후 순서만 간단히 잡아두면 좋아요.",
      summary:
        "도착이 가까울수록 중요한 건 배송 조회보다 개봉 직후 무엇부터 확인할지예요. 처음부터 완벽히 이해하려 하기보다, 박스 확인과 첫 복용 루틴만 단순하게 잡는 편이 덜 불안해요.",
      expectationLines: uniqueStrings(
        [
          status === ORDER_STATUS.PICKUP_COMPLETE
            ? "배송 중에는 상태가 크게 더 달라지기보다 실제 수령과 개봉 순간이 경험을 좌우해요."
            : "조제가 끝난 뒤에는 곧 출고로 넘어가는 구간이라, 지금은 도착 후 첫 행동을 준비하는 편이 더 실용적이에요.",
          "개봉 직후 제일 먼저 볼 것은 상품명과 옵션이 맞는지, 약사 메시지에 복용 관련 안내가 있는지예요.",
          themes.length > 0
            ? `${themes.join(", ")} 같은 목적도 처음 며칠은 체감보다 루틴 정착이 우선이에요.`
            : "",
        ],
        3
      ),
      firstExperienceLines: uniqueStrings(
        [
          "박스를 열면 먼저 상품명과 옵션이 주문한 것과 맞는지만 빠르게 확인해 주세요.",
          ...commonFirstExperienceLines,
        ],
        4
      ),
      reassuranceLines: uniqueStrings(
        [
          guide.hasUsageGuide
            ? "이미 약사 안내가 있다면 그 문장을 따라가면 되고, 스스로 복잡하게 다시 해석하지 않아도 괜찮아요."
            : "안내가 아직 짧더라도 받자마자 모든 판단을 혼자 끝내려 하지 않아도 괜찮아요. 필요한 건 주문 메시지에서 바로 이어갈 수 있어요.",
          "처음 복용 전 불안은 자연스럽지만, 이 구간의 목표는 효과 판정이 아니라 무리 없는 시작이에요.",
        ],
        3
      ),
      helper:
        "도착 직후에는 검색을 늘리기보다, 박스 확인 → 약사 안내 확인 → 첫 복용 시간 고정 순서로 보면 훨씬 덜 복잡해져요.",
      primaryAction: buildPrimaryAction({
        surface: input.surface,
        status,
        hasGuide: guide.hasUsageGuide,
      }),
    };
  }

  return {
    tone: "emerald",
    badge: "도착 후 첫 경험",
    title: "받은 뒤에는 효과를 급하게 재단하기보다, 첫 복용 경험을 편하게 만드는 쪽이 더 중요해요.",
    summary:
      "배송 완료 직후 만족도를 가장 크게 좌우하는 건 ‘얼마나 빨리 느꼈는가’보다 ‘얼마나 덜 헷갈리게 시작했는가’예요. 개봉 직후 확인과 첫 며칠 루틴만 잘 잡아도 만족감이 훨씬 안정적이에요.",
    expectationLines: uniqueStrings(
      [
        "도착한 바로 그날에 모든 체감을 평가하려 하면 기대와 불안이 같이 커지기 쉬워요.",
        themes.length > 0
          ? `${themes.join(", ")} 목적이라도 첫 1~2주는 생활에 붙는지 보는 구간이라고 생각하는 편이 좋아요.`
          : "첫 1~2주는 효과 판정보다 생활에 무리 없이 붙는지 보는 구간이라고 생각하는 편이 좋아요.",
        guide.hasUsageGuide && guide.latestGuide
          ? "이미 남아 있는 약사 안내가 있다면 그 문장을 첫 기준으로 삼는 편이 가장 덜 헷갈려요."
          : "",
      ],
      3
    ),
    firstExperienceLines: uniqueStrings(
      [
        "개봉 직후에는 먼저 주문한 상품과 옵션이 맞는지만 확인하고, 바로 전부를 동시에 시작할 필요는 없어요.",
        ...commonFirstExperienceLines,
        "불편감이나 예상과 다른 점이 있으면 후기보다 먼저 주문 메시지로 남기는 편이 문제를 더 빨리 풀 수 있어요.",
      ],
      4
    ),
    reassuranceLines: uniqueStrings(
      [
        "처음 며칠은 ‘잘 맞나’를 크게 판정하지 않아도 괜찮아요. 같은 시간에 안정적으로 시작하는 것만으로도 충분히 잘하고 있는 거예요.",
        guide.hasUsageGuide
          ? "이미 받은 약사 안내가 있다면 그 범위 안에서만 시작해도 충분하고, 추가 해석을 많이 붙이지 않는 편이 더 편해요."
          : "안내가 부족하게 느껴져도 혼자 결론을 내리기보다 한 줄 질문으로 좁혀 묻는 편이 훨씬 덜 불안해요.",
      ],
      3
    ),
    helper:
      "도착 후 만족도는 거창한 변화보다 ‘쉽게 시작했다’는 감각에서 더 크게 올라와요. 첫 며칠은 단순하게 가는 편이 좋아요.",
    primaryAction: buildPrimaryAction({
      surface: input.surface,
      status,
      hasGuide: guide.hasUsageGuide,
    }),
  };
}
