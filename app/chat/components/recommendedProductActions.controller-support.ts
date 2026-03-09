import type {
  ActionableRecommendation,
  PendingCartAction,
} from "./recommendedProductActions.utils";

export type RecommendedProductActionConfirmDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  targets: ActionableRecommendation[];
  openCartAfterSave?: boolean;
  successFeedback?: string;
};

export function buildSingleRecommendationConfirmDialog(
  item: ActionableRecommendation
): RecommendedProductActionConfirmDialog {
  return {
    title: "장바구니에 담을까요?",
    description: `'${item.productName}'을 장바구니에 추가합니다.`,
    confirmLabel: "담기",
    targets: [item],
    successFeedback: `장바구니에 담았어요: ${item.productName}`,
  };
}

export function buildBulkRecommendationConfirmDialog(
  items: ActionableRecommendation[]
): RecommendedProductActionConfirmDialog {
  return {
    title: `추천 상품 ${items.length}개 담기`,
    description: "추천된 상품을 장바구니에 한 번에 추가합니다.",
    confirmLabel: "전체 담기",
    targets: items,
    successFeedback: `추천 상품 ${items.length}개를 장바구니에 담았어요.`,
  };
}

export function persistRecommendedProductAddress(
  roadAddress: string,
  detailAddress: string
) {
  localStorage.setItem("roadAddress", roadAddress);
  localStorage.setItem("detailAddress", detailAddress);
  window.dispatchEvent(new Event("addressUpdated"));
}

export function resolvePendingCartActionFeedback(pending: PendingCartAction) {
  if (pending.successFeedback) {
    return pending.successFeedback;
  }
  if (pending.items.length === 1) {
    return `장바구니에 담았어요: ${pending.items[0].productName}`;
  }
  return `추천 상품 ${pending.items.length}개를 장바구니에 담았어요.`;
}
