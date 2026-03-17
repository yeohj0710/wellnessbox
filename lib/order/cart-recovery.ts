import { resolveAlternatePaymentMethod } from "./purchase-retention";

export const CHECKOUT_RECOVERY_STORAGE_KEY = "checkoutRecoveryState";
export const CART_UPDATED_AT_STORAGE_KEY = "cartUpdatedAt";
export const PENDING_CART_RECOVERY_ACTION_STORAGE_KEY =
  "pendingCartRecoveryAction";

export type CheckoutRecoveryState = {
  at: number;
  paymentMethod: string | null;
  failureCode: string | null;
  cancelledByUser: boolean;
};

export type CartRecoveryAction =
  | { kind: "bulk_change_7"; label: string }
  | { kind: "chat"; label: string; href: string }
  | { kind: "explore_trial"; label: string; href: string }
  | { kind: "alternate_payment"; label: string; paymentMethod: string }
  | { kind: "open_address"; label: string }
  | { kind: "open_phone"; label: string }
  | { kind: "focus_password"; label: string };

export type CartRecoveryModel = {
  tone: "sky" | "amber" | "emerald";
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  primaryAction: CartRecoveryAction;
  secondaryAction?: CartRecoveryAction;
};

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function daysSince(timestamp: number | null | undefined) {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
  );
}

function buildDraftHref(prompt: string) {
  const params = new URLSearchParams();
  params.set("from", "/cart");
  params.set("draft", prompt);
  return `/chat?${params.toString()}`;
}

function getStorage(storage?: Storage | null) {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readCheckoutRecoveryState(storage?: Storage | null) {
  const target = getStorage(storage);
  if (!target) return null;

  try {
    const raw = target.getItem(CHECKOUT_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutRecoveryState>;
    if (typeof parsed.at !== "number" || !Number.isFinite(parsed.at)) {
      return null;
    }

    return {
      at: parsed.at,
      paymentMethod:
        typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : null,
      failureCode:
        typeof parsed.failureCode === "string" ? parsed.failureCode : null,
      cancelledByUser: parsed.cancelledByUser === true,
    } satisfies CheckoutRecoveryState;
  } catch {
    return null;
  }
}

export function persistCheckoutRecoveryState(
  state: CheckoutRecoveryState,
  storage?: Storage | null
) {
  const target = getStorage(storage);
  if (!target) return;
  target.setItem(CHECKOUT_RECOVERY_STORAGE_KEY, JSON.stringify(state));
}

export function readPendingCartRecoveryAction(storage?: Storage | null) {
  const target = getStorage(storage);
  if (!target) return null;

  const raw = target.getItem(PENDING_CART_RECOVERY_ACTION_STORAGE_KEY);
  if (!raw) return null;

  return raw === "open_address" ||
    raw === "open_phone" ||
    raw === "focus_password"
    ? raw
    : null;
}

export function persistPendingCartRecoveryAction(
  action: "open_address" | "open_phone" | "focus_password",
  storage?: Storage | null
) {
  const target = getStorage(storage);
  if (!target) return;
  target.setItem(PENDING_CART_RECOVERY_ACTION_STORAGE_KEY, action);
}

export function clearPendingCartRecoveryAction(storage?: Storage | null) {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(PENDING_CART_RECOVERY_ACTION_STORAGE_KEY);
}

export function readCartUpdatedAt(storage?: Storage | null) {
  const target = getStorage(storage);
  if (!target) return null;

  const raw = Number(target.getItem(CART_UPDATED_AT_STORAGE_KEY) || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export function buildCartRecoveryModel(input: {
  surface: "cart" | "payment-failed";
  itemCount: number;
  totalPrice: number;
  cartUpdatedAt: number | null;
  selectedPaymentMethod: string | null;
  hasRoadAddress: boolean;
  needsPhoneVerification: boolean;
  hasPassword: boolean;
  hasLongPackage: boolean;
  recoveryState: CheckoutRecoveryState | null;
}): CartRecoveryModel | null {
  if (input.itemCount <= 0) return null;

  const cartAgeDays = daysSince(input.cartUpdatedAt);
  const failureAgeDays = daysSince(input.recoveryState?.at);
  const hasRecentFailure = failureAgeDays != null && failureAgeDays <= 3;
  const staleCart = cartAgeDays != null && cartAgeDays >= 2;
  const highCommitment =
    input.totalPrice >= 80000 || input.itemCount >= 3 || input.hasLongPackage;
  const failedMethod =
    input.recoveryState?.paymentMethod ?? input.selectedPaymentMethod ?? null;

  if (!hasRecentFailure && !staleCart) return null;

  const commonBullets = uniqueStrings(
    [
      hasRecentFailure
        ? "최근 결제 시도가 끝까지 이어지지 않아, 같은 방식으로 다시 미는 것보다 멈춘 이유를 먼저 줄이는 편이 좋아요."
        : "",
      staleCart
        ? `장바구니를 마지막으로 본 지 ${cartAgeDays}일 정도 지나, 지금은 원래 안을 그대로 밀기보다 시작 부담을 낮추는 편이 나아요.`
        : "",
      input.hasRoadAddress
        ? "배송지는 이미 남아 있어, 다시 시작할 때 처음부터 주소를 입력하지 않아도 돼요."
        : "주소가 비어 있으면 다시 돌아왔을 때 결제 전에 한 번 더 멈추기 쉬워요.",
    ],
    4
  );

  if (hasRecentFailure && !input.hasRoadAddress) {
    return {
      tone: "sky",
      badge: "막힌 이유 먼저",
      title: "이번엔 결제보다 주소부터 채우면 같은 이탈을 크게 줄일 수 있어요.",
      body:
        "실패 뒤에 다시 돌아온 사용자는 결제 수단보다 배송이 막히지 않을지부터 먼저 확인할 때 이어지기 쉬워요. 주소부터 정리하면 다음 시도가 한결 가벼워져요.",
      bullets: uniqueStrings(
        [
          "결제 직전 이탈은 입력 항목 하나만 비어 있어도 다시 시도하기가 크게 어려워져요.",
          "주소를 먼저 채우면 결제 재시도보다 쉬운 다음 행동으로 다시 붙을 수 있어요.",
          ...commonBullets,
        ],
        4
      ),
      primaryAction: { kind: "open_address", label: "주소부터 채우기" },
      secondaryAction: {
        kind: "chat",
        label: "멈춘 이유 정리받기",
        href: buildDraftHref(
          "결제 직전에 주소 문제로 멈췄어요. 지금 무엇부터 채우면 다시 덜 막히는지 짧게 정리해 주세요."
        ),
      },
    };
  }

  if (hasRecentFailure && input.needsPhoneVerification) {
    return {
      tone: "sky",
      badge: "막힌 이유 먼저",
      title:
        "이번엔 결제보다 전화번호 인증을 먼저 붙이면 다시 이어가기 쉬워져요.",
      body:
        "결제와 주문 조회에 같이 연결되는 정보라, 인증 한 단계만 먼저 끝내도 다시 시도할 때 에너지가 훨씬 덜 들어요.",
      bullets: uniqueStrings(
        [
          "실패 직후에는 정보를 늘리기보다 막는 항목 하나만 먼저 채우는 편이 좋아요.",
          "인증이 붙으면 주문 확인과 후속 수정도 더 수월해져요.",
          ...commonBullets,
        ],
        4
      ),
      primaryAction: { kind: "open_phone", label: "전화번호 인증하기" },
      secondaryAction: {
        kind: "chat",
        label: "다음 행동 정리받기",
        href: buildDraftHref(
          "결제 직전에 전화번호 인증 문제로 멈췄어요. 다시 덜 막히게 이어가는 순서를 짧게 정리해 주세요."
        ),
      },
    };
  }

  if (hasRecentFailure && !input.hasPassword) {
    return {
      tone: "sky",
      badge: "막힌 이유 먼저",
      title:
        "지금은 주문 조회 비밀번호부터 붙여두는 편이 다시 돌아오기 쉬워요.",
      body:
        "실패 뒤에는 나중에 확인할 수 있을지 불안해서 다시 이탈하기 쉬워요. 비밀번호만 먼저 적어두면 결제 재시도 부담이 줄어들어요.",
      bullets: uniqueStrings(
        [
          "비밀번호는 결제 후 주문 확인까지 이어지는 안전장치라 다시 시작할 이유를 만들어 줘요.",
          ...commonBullets,
        ],
        4
      ),
      primaryAction: {
        kind: "focus_password",
        label: "비밀번호 먼저 입력하기",
      },
      secondaryAction: {
        kind: "chat",
        label: "다시 이어가는 순서 보기",
        href: buildDraftHref(
          "결제 직전에 주문 조회 비밀번호 때문에 멈췄어요. 다시 덜 막히게 이어가는 순서를 짧게 정리해 주세요."
        ),
      },
    };
  }

  if (highCommitment) {
    return {
      tone: hasRecentFailure ? "amber" : "sky",
      badge: hasRecentFailure ? "결제 실패 회복" : "방치 장바구니 회복",
      title:
        input.surface === "payment-failed"
          ? "같은 구성을 그대로 다시 밀기보다 7일치처럼 가볍게 다시 시작하는 편이 쉬워요."
          : "오래 둔 장바구니는 그대로 결제보다 시작 부담을 낮춘 쪽이 더 자연스러워요.",
      body:
        "상품 수가 많거나 총액이 큰 장바구니는 한 번 멈춘 뒤 다시 같은 체크아웃으로 보내면 또 끊기기 쉬워요. 지금은 안을 유지하기보다 강도를 낮춰 보는 편이 다음 행동으로 이어져요.",
      bullets: uniqueStrings(
        [
          input.hasLongPackage
            ? "30일 이상 구성은 돌아왔을 때 부담이 다시 커지기 쉬워요."
            : "",
          "처음부터 전체를 마무리하기보다 가볍게 다시 시작하는 쪽이 회복 전환에 더 잘 맞아요.",
          ...commonBullets,
        ],
        4
      ),
      primaryAction:
        input.surface === "cart"
          ? { kind: "bulk_change_7", label: "전체 7일치로 낮춰보기" }
          : {
              kind: "explore_trial",
              label: "7일치부터 다시 보기",
              href: "/explore?package=7",
            },
      secondaryAction: {
        kind: "chat",
        label: "멈춘 이유 정리받기",
        href: buildDraftHref(
          "장바구니가 커서 결제가 멈춘 것 같아요. 지금 구성 기준으로 더 가벼운 다음 행동 하나만 추천해 주세요."
        ),
      },
    };
  }

  if (hasRecentFailure && failedMethod) {
    const alternate = resolveAlternatePaymentMethod(failedMethod);

    return {
      tone: "amber",
      badge: "결제 실패 회복",
      title:
        "지금은 같은 결제 수단 재시도보다 다른 결제 흐름으로 가볍게 바꿔보는 편이 쉬워요.",
      body:
        "인증 단계에서 끊긴 결제는 장바구니를 처음부터 다시 보는 것보다 다른 수단으로 바로 넘기는 편이 회복률이 높아요.",
      bullets: uniqueStrings(
        [
          "실패 직후엔 결제 수단만 바꿔도 심리적 저항이 크게 줄어요.",
          "장바구니와 입력 정보가 남아 있으면 전체를 다시 고를 필요가 없어요.",
          ...commonBullets,
        ],
        4
      ),
      primaryAction: {
        kind: "alternate_payment",
        label: alternate.label,
        paymentMethod: alternate.method,
      },
      secondaryAction: {
        kind: "chat",
        label: "다시 안 막히는 방법 보기",
        href: buildDraftHref(
          "결제 수단 인증에서 멈췄어요. 같은 장바구니로 다시 안 막히게 이어가는 방법을 짧게 정리해 주세요."
        ),
      },
    };
  }

  return {
    tone: "sky",
    badge: staleCart ? "방치 장바구니 회복" : "결제 실패 회복",
    title:
      input.surface === "payment-failed"
        ? "지금은 바로 결제 재시도보다 왜 멈췄는지 한 번만 좁혀보는 편이 쉬워요."
        : "다시 돌아온 장바구니는 같은 화면 반복보다 다음 행동을 더 짧게 만드는 편이 좋아요.",
    body:
      "한 번 멈춘 뒤에는 같은 체크아웃을 다시 보여주는 것보다, 지금 멈춘 이유를 짚고 더 쉬운 다음 행동 하나로 보내는 쪽이 회복 전환에 더 맞아요.",
    bullets: uniqueStrings(
      [
        "지금 단계에선 설명을 늘리기보다 다음 행동 하나만 분명하게 두는 편이 좋아요.",
        ...commonBullets,
      ],
      4
    ),
    primaryAction: {
      kind: "chat",
      label: "멈춘 이유 정리받기",
      href: buildDraftHref(
        "장바구니나 결제에서 왜 멈췄는지 잘 모르겠어요. 지금 상황 기준으로 가장 쉬운 다음 행동 하나만 짧게 추천해 주세요."
      ),
    },
    secondaryAction: {
      kind: "explore_trial",
      label: "가볍게 다시 둘러보기",
      href: "/explore?package=7",
    },
  };
}
