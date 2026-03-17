type PurchaseRetentionTone = "sky" | "amber" | "emerald";

export type PurchaseRetentionModel = {
  tone: PurchaseRetentionTone;
  badge: string;
  title: string;
  body: string;
  bullets: string[];
};

type CheckoutConfidenceInput = {
  totalPrice: number;
  itemCount: number;
  isUserLoggedIn: boolean;
  needsPhoneVerification: boolean;
  hasPassword: boolean;
  hasDeliveryContext: boolean;
  selectedPaymentMethod: string;
};

type PaymentRecoveryInput = {
  paymentMethod: string | null;
  cancelledByUser: boolean;
  failureCode: string | null;
  itemCount: number;
  totalPrice: number;
  hasRoadAddress: boolean;
  hasPhone: boolean;
};

type OrderConfidenceInput = {
  status: string;
  totalPrice: number;
  itemCount: number;
  roadAddress?: string | null;
  phone?: string | null;
  requestNotes?: string | null;
  entrancePassword?: string | null;
  directions?: string | null;
};

function resolvePaymentLabel(method: string | null | undefined) {
  if (method === "kakao") return "카카오페이";
  if (method === "kpn") return "NHN KCP";
  return "카드 결제";
}

function hasDeliveryContext(input: {
  requestNotes?: string | null;
  entrancePassword?: string | null;
  directions?: string | null;
}) {
  return Boolean(
    input.requestNotes?.trim() ||
      input.entrancePassword?.trim() ||
      input.directions?.trim()
  );
}

export function resolveAlternatePaymentMethod(currentMethod: string | null) {
  if (currentMethod === "kakao") {
    return { method: "inicis", label: "카드로 다시 시도" } as const;
  }
  return { method: "kakao", label: "카카오페이로 바꿔보기" } as const;
}

export function buildCheckoutConfidence(
  input: CheckoutConfidenceInput
): PurchaseRetentionModel {
  const highCommitment = input.totalPrice >= 90000 || input.itemCount >= 3;
  const paymentLabel = resolvePaymentLabel(input.selectedPaymentMethod);
  const bullets: string[] = [];

  if (highCommitment) {
    bullets.push(
      "결제 직후 바로 끝나는 것이 아니라 약사 검토와 상담 단계를 거쳐 조제가 이어져요."
    );
  } else {
    bullets.push(
      "첫 결제 뒤에도 주문 상태와 약사 안내를 다시 확인할 수 있게 흐름이 이어져 있어요."
    );
  }

  bullets.push(
    "결제가 중간에 멈춰도 장바구니와 입력한 주문 정보는 유지돼서 다시 시도하기 쉬워요."
  );

  if (!input.hasDeliveryContext) {
    bullets.push(
      "공동현관 비밀번호나 전달 메모가 있으면 지금 추가해 두거나 주문 직후 메시지로 바로 보완할 수 있어요."
    );
  } else {
    bullets.push(
      "전달 메모와 연락처가 정리돼 있으면 배송 전 확인 연락과 재문의가 줄어들어요."
    );
  }

  if (!input.isUserLoggedIn || input.needsPhoneVerification || !input.hasPassword) {
    bullets.push(
      "로그인, 전화번호 인증, 주문 조회 비밀번호는 결제 이후 주문 확인과 수정 문의를 빠르게 이어주기 위한 정보예요."
    );
  } else {
    bullets.push(
      "지금 입력한 전화번호와 비밀번호로 결제 뒤 주문 상태를 바로 조회할 수 있어요."
    );
  }

  return {
    tone: highCommitment ? "amber" : "sky",
    badge: highCommitment ? "결제 전 안심" : "주문 전 안내",
    title: highCommitment
      ? "지금 망설여지는 이유를 줄여 두고 결제하는 편이 좋아요"
      : `${paymentLabel} 전, 알아두면 안심되는 내용을 먼저 정리했어요`,
    body: highCommitment
      ? "구성이 크거나 금액이 높을수록 '바로 결제해도 괜찮나'가 가장 큰 불안이 되기 쉬워요. 그래서 결제 뒤에도 조정과 확인이 이어질 수 있게 흐름이 잡혀 있어요."
      : "결제만 끝나면 끝나는 구조가 아니라, 주문 확인과 후속 안내까지 이어지는 흐름이라 부담을 덜고 시작할 수 있어요.",
    bullets: bullets.slice(0, 4),
  };
}

export function buildPaymentRecovery(
  input: PaymentRecoveryInput
): PurchaseRetentionModel {
  const paymentLabel = resolvePaymentLabel(input.paymentMethod);
  const likelyRetryIssue = Boolean(input.failureCode && input.failureCode.trim());
  const bullets: string[] = [];

  bullets.push(
    "이번에는 주문 생성이 완료되지 않았기 때문에, 다시 시도하더라도 기존 주문과 중복으로 잡히지 않아요."
  );

  if (input.hasRoadAddress || input.hasPhone) {
    bullets.push(
      "장바구니와 입력했던 주소·연락처는 유지돼서 처음부터 다시 적을 가능성을 줄였어요."
    );
  } else {
    bullets.push("장바구니 구성은 유지돼서 같은 상품을 다시 고를 필요를 줄였어요.");
  }

  bullets.push(
    input.cancelledByUser
      ? "지금은 잠시 멈춘 상태라, 구성부터 다시 보고 같은 결제나 다른 결제로 이어가면 돼요."
      : `${paymentLabel} 인증이 중간에 끊긴 경우에는 다른 결제수단으로 바꾸면 더 매끄럽게 이어질 수 있어요.`
  );

  if (input.itemCount > 0 || input.totalPrice > 0) {
    bullets.push(
      `이전 구성은 ${Math.max(input.itemCount, 1)}개 상품${
        input.totalPrice > 0 ? `, 총 ${input.totalPrice.toLocaleString("ko-KR")}원` : ""
      } 기준이에요.`
    );
  }

  return {
    tone: input.cancelledByUser ? "sky" : likelyRetryIssue ? "amber" : "sky",
    badge: "결제 복구",
    title: input.cancelledByUser
      ? "결제를 멈췄지만 주문은 아직 생성되지 않았어요"
      : "결제가 끝나지 않아도 다시 이어가기 쉽게 준비해 뒀어요",
    body: input.cancelledByUser
      ? "구성을 다시 보거나 결제수단만 바꿔서 이어갈 수 있는 상태예요. 급하게 붙잡기보다, 방금 막힌 이유를 줄이는 쪽이 더 중요해요."
      : "결제 인증이나 앱 전환에서 끊겨도 장바구니를 처음부터 다시 만들 필요가 없도록 복구 흐름을 남겨 뒀어요.",
    bullets: bullets.slice(0, 4),
  };
}

export function buildOrderConfidence(
  input: OrderConfidenceInput
): PurchaseRetentionModel {
  const deliveryContextReady = hasDeliveryContext(input);
  const highCommitment = input.totalPrice >= 90000 || input.itemCount >= 3;
  const bullets: string[] = [];

  bullets.push(
    "결제 직후 바로 조제가 확정되는 것이 아니라, 약사 검토와 상담 단계를 거쳐 다음 상태로 넘어가요."
  );

  if (!deliveryContextReady) {
    bullets.push(
      "공동현관 비밀번호나 전달 요청이 있다면 주문 초기에 내 주문 메시지로 남기는 편이 취소와 재배송 문의를 줄여줘요."
    );
  } else {
    bullets.push(
      "전달 메모와 연락처가 이미 정리돼 있어 배송 전 추가 확인이 줄어들 가능성이 높아요."
    );
  }

  if (input.roadAddress || input.phone) {
    bullets.push(
      "지금 저장된 주소와 연락처를 기준으로 진행되므로, 바뀐 정보가 있으면 조제 전 단계에서 먼저 알려주는 편이 안전해요."
    );
  }

  if (highCommitment) {
    bullets.push(
      "구성이 크거나 금액이 큰 주문일수록 약사 검토를 거친 뒤 진행되므로, 걱정되는 점은 초기에 메시지로 정리하는 편이 좋아요."
    );
  }

  return {
    tone: "emerald",
    badge: "주문 직후 안내",
    title: "결제는 끝났고, 지금부터는 불안을 줄이는 안내가 더 중요해요",
    body:
      "주문 직후 취소나 환불로 이어지는 가장 큰 이유는 '이제 무엇이 일어나는지 모르겠다'는 불안인 경우가 많아요. 그래서 지금 단계에서 기대 흐름을 먼저 분명히 보여주는 편이 좋아요.",
    bullets: bullets.slice(0, 4),
  };
}
