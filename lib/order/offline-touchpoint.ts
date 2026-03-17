import { ORDER_STATUS, type OrderStatus } from "./orderStatus";

export type OfflineTouchpointOrderInput = {
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

type OfflineTouchpointMessage = {
  pharmacyId: number | null;
  content?: string | null;
};

export type OfflineTouchpointCoachModel = {
  tone: "sky" | "emerald";
  badge: string;
  title: string;
  summary: string;
  qrLabel: string;
  qrSummary: string;
  stepLines: string[];
  insertLines: string[];
  helper: string;
  primaryActionLabel: string;
  primaryHref: string;
  secondaryHref: string;
  secondaryLabel: string;
  shareTitle: string;
  shareText: string;
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
  const match = text.match(/(\d+)\s*(?:일|day|days)/i);
  if (match) return Number.parseInt(match[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function getProductNames(order: OfflineTouchpointOrderInput) {
  return uniqueStrings(
    (order.orderItems || [])
      .map((item) => normalizeText(item.pharmacyProduct?.product?.name))
      .filter(Boolean),
    3
  );
}

function getThemeNames(order: OfflineTouchpointOrderInput) {
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

function hasLongPackage(order: OfflineTouchpointOrderInput) {
  return (order.orderItems || []).some((item) => {
    const days = parseOptionDays(item.pharmacyProduct?.optionType);
    return typeof days === "number" && days >= 30;
  });
}

function hasPharmacyGuide(messages: OfflineTouchpointMessage[] = []) {
  return messages.some((message) => {
    if (message.pharmacyId == null) return false;
    return /(복용|식전|식후|보관|시간|주의|하루|아침|저녁)/.test(
      normalizeText(message.content)
    );
  });
}

function hasDeliveryContext(order: OfflineTouchpointOrderInput) {
  return Boolean(
    normalizeText(order.requestNotes) ||
      normalizeText(order.entrancePassword) ||
      normalizeText(order.directions)
  );
}

function buildChatHref(surface: "order-complete" | "my-orders", draftPrompt: string) {
  const params = new URLSearchParams();
  params.set("from", surface === "order-complete" ? "/order-complete" : "/my-orders");
  params.set("draft", draftPrompt);
  return `/chat?${params.toString()}`;
}

export function buildOfflineTouchpointCoach(input: {
  order: OfflineTouchpointOrderInput;
  messages?: OfflineTouchpointMessage[];
  surface: "order-complete" | "my-orders";
}): OfflineTouchpointCoachModel {
  const status = normalizeOrderStatus(input.order.status);
  const productNames = getProductNames(input.order);
  const themeNames = getThemeNames(input.order);
  const itemCount = input.order.orderItems?.length ?? 0;
  const longPackage = hasLongPackage(input.order);
  const pharmacyGuide = hasPharmacyGuide(input.messages);
  const deliveryContext = hasDeliveryContext(input.order);
  const labelText =
    productNames.length > 0
      ? productNames.join(", ")
      : themeNames.length > 0
      ? `${themeNames.join(", ")} 구성`
      : "이번 구성";

  const preDelivery =
    status === ORDER_STATUS.PAYMENT_COMPLETE ||
    status === ORDER_STATUS.COUNSEL_COMPLETE ||
    status === ORDER_STATUS.DISPENSE_COMPLETE ||
    status === ORDER_STATUS.PICKUP_COMPLETE;

  const draftPrompt = preDelivery
    ? `${labelText}이 도착했을 때 개봉 직후 확인할 순서, 첫 복용 시간을 하나 정하는 방법, 약사에게 바로 물어볼 질문 1개만 짧게 정리해줘.`
    : pharmacyGuide
    ? `방금 받은 ${labelText} 기준으로 약사 안내를 벗어나지 않게 첫 복용 순서, 보관 포인트, 오늘 바로 확인할 점만 짧게 정리해줘.`
    : `방금 받은 ${labelText} 기준으로 첫 복용 순서, 보관 포인트, 지금 약사에게 확인하면 좋은 질문 1개만 짧게 정리해줘.`;

  const primaryHref = buildChatHref(input.surface, draftPrompt);
  const secondaryHref = "/my-orders";

  if (preDelivery) {
    return {
      tone: "sky",
      badge: "박스 오픈 코치",
      title: "도착 뒤 바로 헷갈리지 않게, 박스 안 QR이 열어야 할 첫 행동을 미리 정해둘 수 있어요.",
      summary:
        "오프라인 접점에서 중요한 건 설명을 많이 넣는 것보다, 개봉 직후 무엇부터 볼지 한 번에 열리게 만드는 거예요. 이번 주문은 박스 안 QR이 첫 복용 가이드와 질문 초안을 바로 열도록 잡는 편이 가장 자연스러워요.",
      qrLabel: "박스 안 QR이 열면 좋은 화면",
      qrSummary:
        "도착 후 QR을 열면 AI가 이 주문 기준으로 개봉 순서, 첫 복용 시간, 약사에게 확인할 질문을 짧게 정리해주는 흐름이에요.",
      stepLines: uniqueStrings(
        [
          "도착 전에는 복용법을 외우기보다, QR이 열어줄 첫 질문 하나만 기억해 두면 충분해요.",
          itemCount >= 2
            ? "구성이 여러 개여도 QR은 전부 설명하지 않고 첫날 순서만 먼저 좁혀주는 편이 더 덜 복잡해요."
            : "구성이 단순할수록 QR은 긴 설명보다 첫 복용 순서만 보여주는 편이 더 잘 먹혀요.",
          deliveryContext
            ? "배송 메모가 이미 정리돼 있다면 수령 뒤에는 복용 시작 쪽에 집중하기 쉬워요."
            : "배송 메모가 비어 있어도 지금은 박스 도착 뒤의 첫 행동만 정해두면 충분해요.",
        ],
        3
      ),
      insertLines: uniqueStrings(
        [
          "동봉 문구는 길게 쓰기보다 ‘개봉 직후 30초 가이드 열기’처럼 행동 하나만 강조하는 편이 좋아요.",
          longPackage
            ? "장기 패키지일수록 QR은 효과 기대보다 첫 3일 루틴과 보관 포인트를 먼저 열어주는 편이 더 안전해요."
            : "7일치 중심 구성이라면 QR은 부담 없이 시작하는 흐름을 여는 데 특히 잘 맞아요.",
          "박스 안 설명과 화면 카피가 다르면 신뢰가 깨지기 쉬워서, 같은 질문 초안을 그대로 재사용하는 편이 좋아요.",
        ],
        3
      ),
      helper:
        "실제 종이 동봉물에서 가장 강한 한 줄은 ‘이 QR을 열면 지금 내 주문 기준으로 첫 복용만 정리해드려요’에 가까워요.",
      primaryActionLabel: "박스 안 QR 흐름 미리 보기",
      primaryHref,
      secondaryHref,
      secondaryLabel: "내 주문 화면으로 보기",
      shareTitle: "웰니스박스 박스 오픈 가이드",
      shareText:
        "박스가 도착하면 이 링크로 개봉 직후 순서, 첫 복용 시간, 약사에게 물을 질문까지 바로 이어볼 수 있어요.",
    };
  }

  return {
    tone: "emerald",
    badge: "개봉 직후 가이드",
    title: "박스를 열었다면, 지금 필요한 건 전부 읽는 것보다 첫 복용을 덜 헷갈리게 시작하는 거예요.",
    summary:
      "개봉 순간에는 상품 설명을 길게 보는 것보다, 이번 주문 기준으로 무엇부터 확인하고 어떻게 시작할지 바로 정리되는 흐름이 만족도를 더 크게 좌우해요. 그래서 박스 안 QR도 이 주문 전용 시작 가이드를 여는 편이 가장 효과적이에요.",
    qrLabel: "지금 QR로 열면 좋은 질문",
    qrSummary:
      "방금 받은 구성 기준으로 첫 복용 순서, 보관 포인트, 추가로 확인할 질문 1개만 바로 정리되도록 설계했어요.",
    stepLines: uniqueStrings(
      [
        "개봉 직후에는 먼저 주문한 상품과 옵션이 맞는지만 보고, 모든 정보를 한 번에 이해하려고 하지 않아도 괜찮아요.",
        pharmacyGuide
          ? "이미 받은 약사 안내가 있다면 그 범위를 벗어나지 않게 첫 복용만 정리하는 흐름이 가장 안전해요."
          : "아직 약사 안내가 선명하지 않다면 QR이 바로 질문 초안을 열어주도록 두는 편이 덜 막혀요.",
        longPackage
          ? "30일 이상 구성일수록 첫날 목표는 오래 가는 기대보다 무리 없이 붙는 시작을 만드는 쪽이에요."
          : "짧은 패키지라도 첫 1~2회 복용 리듬을 먼저 잡으면 체감과 재방문이 더 안정적이에요.",
      ],
      3
    ),
    insertLines: uniqueStrings(
      [
        "동봉 QR 문구는 ‘왜 먹는지’보다 ‘지금 무엇부터 보면 되는지’를 여는 쪽이 실제로 더 많이 눌려요.",
        themeNames.length > 0
          ? `${themeNames.join(", ")} 목적 구성이라면 QR에서 기대 시점보다 첫 복용 루틴과 주의 포인트를 먼저 여는 편이 더 자연스러워요.`
          : "목적 설명을 길게 늘리기보다 첫 복용 루틴과 확인 질문 하나로 시작하는 편이 부담이 적어요.",
        "같은 링크를 다른 기기에 보내 둘 수 있으면 식탁이나 침대 옆에서 다시 열기도 쉬워져요.",
      ],
      3
    ),
    helper:
      "오프라인 접점의 핵심은 설명량이 아니라 실행률이에요. QR 하나가 ‘개봉 → 첫 복용 → 후속 질문’까지 바로 이어지면 재방문 이유도 함께 생겨요.",
    primaryActionLabel: "개봉 직후 가이드 열기",
    primaryHref,
    secondaryHref,
    secondaryLabel: "주문 상세 다시 보기",
    shareTitle: "웰니스박스 개봉 직후 가이드",
    shareText:
      "방금 받은 주문 기준으로 첫 복용 순서, 보관 포인트, 약사에게 물을 질문까지 바로 이어볼 수 있어요.",
  };
}
