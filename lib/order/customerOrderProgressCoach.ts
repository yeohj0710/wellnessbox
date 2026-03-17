import { ORDER_STATUS, type OrderStatus } from "./orderStatus";

type CustomerOrderProgressOrder = {
  status: OrderStatus;
  createdAt: string | number | Date;
  requestNotes?: string | null;
  entrancePassword?: string | null;
  directions?: string | null;
  orderItems?: Array<{
    review?: {
      rate?: number | null;
    } | null;
  }>;
};

type CustomerOrderProgressMessage = {
  pharmacyId: number | null;
  timestamp: number;
  createdAt: string;
};

export type CustomerOrderProgressCoachAction =
  | "message"
  | "subscribe"
  | "none";

export type CustomerOrderProgressCoachModel = {
  tone: "sky" | "amber" | "emerald" | "slate";
  badge: string;
  title: string;
  summary: string;
  reasons: string[];
  helper: string;
  primaryAction: {
    kind: CustomerOrderProgressCoachAction;
    label: string | null;
  };
};

type BuildCustomerOrderProgressCoachInput = {
  order: CustomerOrderProgressOrder;
  messages: CustomerOrderProgressMessage[];
  isSubscribed: boolean;
  now?: Date;
};

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
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

function hasDeliveryContext(order: CustomerOrderProgressOrder) {
  return Boolean(
    order.requestNotes?.trim() ||
      order.entrancePassword?.trim() ||
      order.directions?.trim()
  );
}

function areReviewsCompleted(order: CustomerOrderProgressOrder) {
  if (!order.orderItems?.length) return false;
  return order.orderItems.every((item) => Boolean(item.review?.rate));
}

export function buildCustomerOrderProgressCoach({
  order,
  messages,
  isSubscribed,
  now = new Date(),
}: BuildCustomerOrderProgressCoachInput): CustomerOrderProgressCoachModel {
  const sortedMessages = [...messages].sort((left, right) => left.timestamp - right.timestamp);
  const lastMessage = sortedMessages.at(-1) ?? null;
  const lastMessageDate = toDate(lastMessage?.timestamp ?? lastMessage?.createdAt ?? null);
  const orderCreatedAt = toDate(order.createdAt);
  const orderElapsed = formatElapsed(orderCreatedAt, now);
  const lastMessageElapsed = formatElapsed(lastMessageDate, now);
  const waitingForCustomer = lastMessage?.pharmacyId != null;
  const waitingForPharmacy = Boolean(lastMessage) && !waitingForCustomer;
  const needsDeliveryContext =
    (order.status === ORDER_STATUS.DISPENSE_COMPLETE ||
      order.status === ORDER_STATUS.PICKUP_COMPLETE) &&
    !hasDeliveryContext(order);
  const shouldSuggestSubscription =
    !isSubscribed &&
    order.status !== ORDER_STATUS.CANCELED &&
    order.status !== ORDER_STATUS.DELIVERY_COMPLETE;
  const reviewPending =
    order.status === ORDER_STATUS.DELIVERY_COMPLETE && !areReviewsCompleted(order);

  if (order.status === ORDER_STATUS.CANCELED) {
    return {
      tone: "slate",
      badge: "주문 종료",
      title: "취소된 주문이에요",
      summary:
        "이 주문은 더 진행되지 않으니, 예상과 다르게 취소됐다면 약국에 한 번만 문의하는 편이 좋아요.",
      reasons: [
        "취소 상태에서는 배송이나 조제 단계가 더 진행되지 않아요.",
        waitingForPharmacy
          ? `마지막 문의는 ${lastMessageElapsed ?? "이전"}에 남겨졌어요.`
          : "필요하면 메시지로 취소 사유를 확인할 수 있어요.",
      ],
      helper: "같은 내용을 반복 전송하기보다 취소 이유나 다음 주문 가능 여부만 간단히 물어보는 편이 좋아요.",
      primaryAction: {
        kind: waitingForPharmacy ? "message" : "none",
        label: waitingForPharmacy ? "약국에 다시 문의하기" : null,
      },
    };
  }

  if (waitingForCustomer) {
    return {
      tone: "amber",
      badge: "답변 필요",
      title: "약국 답변 확인이 먼저예요",
      summary:
        "약국에서 추가 확인이나 안내를 보낸 상태라, 답장을 주면 다음 단계가 더 빨리 이어질 가능성이 커요.",
      reasons: [
        lastMessageElapsed
          ? `약국 메시지가 ${lastMessageElapsed}에 도착했어요.`
          : "약국에서 확인 메시지가 와 있어요.",
        "복용 안내나 배송 관련 확인이 끝나야 다음 단계로 넘어갈 수 있어요.",
        shouldSuggestSubscription
          ? "알림을 켜 두면 다음 답변도 놓치지 않아요."
          : "메시지 한 번만 정리해서 답하면 충분해요.",
      ],
      helper:
        "응답이 길지 않아도 괜찮아요. 필요한 정보만 짧게 답하면 약국이 다음 단계를 이어가기 쉬워져요.",
      primaryAction: {
        kind: "message",
        label: "답장 남기기",
      },
    };
  }

  if (order.status === ORDER_STATUS.PAYMENT_COMPLETE) {
    const longWait = orderCreatedAt
      ? now.getTime() - orderCreatedAt.getTime() >= 45 * 60_000
      : false;

    return {
      tone: longWait ? "amber" : "sky",
      badge: "접수 단계",
      title: "약국이 주문 내용을 확인 중이에요",
      summary: longWait
        ? "주문 후 시간이 조금 지났다면, 지금은 중복 문의보다 필요한 정보 한 번만 정리해 남기는 편이 더 좋아요."
        : "결제는 끝났고 약국이 첫 검토를 시작하는 단계예요.",
      reasons: [
        "아직 상담 전 단계라 약국 확인이 끝나면 다음 상태로 바뀌어요.",
        orderElapsed
          ? `주문 접수 후 ${orderElapsed} 경과했어요.`
          : "접수 직후에는 상태가 바로 바뀌지 않을 수 있어요.",
        shouldSuggestSubscription
          ? "주문 알림을 켜 두면 첫 답변이나 상태 변경을 놓치지 않아요."
          : "상태 변경은 자동으로 반영되니 잠시만 기다려 보셔도 괜찮아요.",
      ],
      helper: longWait
        ? "급한 요청이 있다면 배송 메모나 핵심 문의만 한 번 남겨 주세요."
        : "같은 내용을 여러 번 보내기보다 첫 답변을 기다리는 편이 흐름을 덜 끊어요.",
      primaryAction: {
        kind: shouldSuggestSubscription ? "subscribe" : "none",
        label: shouldSuggestSubscription ? "주문 알림 켜기" : null,
      },
    };
  }

  if (order.status === ORDER_STATUS.COUNSEL_COMPLETE) {
    return {
      tone: "sky",
      badge: "상담 완료",
      title: "상담이 끝나고 다음 준비로 넘어가는 중이에요",
      summary:
        waitingForPharmacy
          ? "약국이 마지막 메시지를 확인 중일 수 있어요. 같은 문의는 잠시만 기다렸다가 보내는 편이 좋아요."
          : "복용 안내가 정리된 뒤 조제 단계로 이어지는 구간이에요.",
      reasons: [
        "상담이 끝났다면 보통 조제 준비가 이어져요.",
        waitingForPharmacy && lastMessageElapsed
          ? `마지막 고객 메시지는 ${lastMessageElapsed}에 전송됐어요.`
          : "추가 안내가 필요하면 메시지로 이어질 수 있어요.",
        shouldSuggestSubscription
          ? "알림을 켜 두면 조제 시작이나 추가 안내를 더 빨리 확인할 수 있어요."
          : "지금은 상태 변경 알림을 기다리는 편이 좋아요.",
      ],
      helper:
        "복용이나 배송과 직접 관련된 새 정보가 생겼을 때만 추가 메시지를 남겨도 충분해요.",
      primaryAction: {
        kind: shouldSuggestSubscription ? "subscribe" : "none",
        label: shouldSuggestSubscription ? "주문 알림 켜기" : null,
      },
    };
  }

  if (order.status === ORDER_STATUS.DISPENSE_COMPLETE) {
    return {
      tone: needsDeliveryContext ? "amber" : "sky",
      badge: "조제 완료",
      title: needsDeliveryContext
        ? "배송 전에 전달 메모를 남겨 두면 좋아요"
        : "조제는 끝났고 출고 준비 단계예요",
      summary: needsDeliveryContext
        ? "공동현관 비밀번호나 전달 메모가 비어 있으면 배송 직전 확인이 한 번 더 필요할 수 있어요."
        : "이제는 라이더 인계나 최종 출고 안내를 기다리는 단계예요.",
      reasons: [
        "조제 자체는 끝났고 다음 흐름은 전달 정보와 출고 준비에 가까워요.",
        needsDeliveryContext
          ? "지금 메모를 남기면 배송 단계에서 다시 확인하는 시간을 줄일 수 있어요."
          : "추가 확인이 없다면 비교적 빠르게 다음 상태로 넘어갈 수 있어요.",
        shouldSuggestSubscription
          ? "알림을 켜 두면 라이더 인계 시점을 놓치지 않아요."
          : "출고 전후에는 상태 변경이 비교적 빨라질 수 있어요.",
      ],
      helper: needsDeliveryContext
        ? "메시지에는 공동현관, 부재 시 요청, 문 앞 전달 여부처럼 배송에 꼭 필요한 정보만 적어 주세요."
        : "문의가 없다면 지금은 별도 조치보다 상태 변경을 기다리는 편이 좋아요.",
      primaryAction: {
        kind: needsDeliveryContext
          ? "message"
          : shouldSuggestSubscription
            ? "subscribe"
            : "none",
        label: needsDeliveryContext
          ? "배송 메모 남기기"
          : shouldSuggestSubscription
            ? "주문 알림 켜기"
            : null,
      },
    };
  }

  if (order.status === ORDER_STATUS.PICKUP_COMPLETE) {
    return {
      tone: needsDeliveryContext ? "amber" : "emerald",
      badge: "배송 중",
      title: needsDeliveryContext
        ? "배송 중이지만 전달 메모를 한 번 더 남겨 주세요"
        : "배송이 진행 중이에요",
      summary: needsDeliveryContext
        ? "라이더가 이미 이동 중일 수 있어, 필요한 정보가 있다면 지금 한 번만 짧게 남기는 편이 좋아요."
        : "현재는 상태가 바뀌는 속도가 빨라질 수 있으니 알림과 메시지만 잘 확인하면 돼요.",
      reasons: [
        "약국 단계는 끝났고 수령 준비에 가까운 상태예요.",
        needsDeliveryContext
          ? "공동현관 정보나 요청 메모가 없으면 수령 과정에서 연락이 필요할 수 있어요."
          : "추가 문의보다 수령 가능 여부를 확인해 두는 편이 좋아요.",
        shouldSuggestSubscription
          ? "알림을 켜 두면 배송 완료를 바로 확인할 수 있어요."
          : "필요한 경우에만 메시지를 남기면 흐름이 더 매끄러워요.",
      ],
      helper: needsDeliveryContext
        ? "기사 전달에 꼭 필요한 정보만 남기고, 중복 메시지는 피하는 편이 좋아요."
        : "수령이 어려워질 상황이 생겼을 때만 한 번에 정리해서 남겨 주세요.",
      primaryAction: {
        kind: needsDeliveryContext
          ? "message"
          : shouldSuggestSubscription
            ? "subscribe"
            : "none",
        label: needsDeliveryContext
          ? "수령 메모 남기기"
          : shouldSuggestSubscription
            ? "주문 알림 켜기"
            : null,
      },
    };
  }

  return {
    tone: reviewPending ? "emerald" : "sky",
    badge: reviewPending ? "배송 완료" : "주문 진행",
    title: reviewPending ? "배송이 완료됐어요" : "주문 흐름은 정상적으로 이어지고 있어요",
    summary: reviewPending
      ? "복용 전 안내 메시지를 다시 확인하고, 문제가 없었다면 후기를 남겨도 좋아요."
      : "현재 보이는 상태와 메시지를 기준으로 큰 추가 조치 없이 진행 중인 주문이에요.",
    reasons: [
      reviewPending
        ? "수령 이후에는 복용 안내와 배송 메모를 다시 확인하는 편이 좋아요."
        : "급한 추가 정보가 없다면 현재 흐름을 그대로 따라가면 돼요.",
      waitingForPharmacy && lastMessageElapsed
        ? `마지막 문의는 ${lastMessageElapsed}에 남겨졌어요.`
        : "필요할 때만 메시지를 남기면 확인이 더 쉬워요.",
    ],
    helper: reviewPending
      ? "복용 중 불편이나 이상 반응이 있으면 리뷰보다 메시지나 상담으로 먼저 알려 주세요."
      : "상태가 멈춰 보이더라도 각 단계 사이에는 준비 시간이 있을 수 있어요.",
    primaryAction: {
      kind: "none",
      label: null,
    },
  };
}
