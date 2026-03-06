export const CART_COPY = {
  fetchPharmacyErrorPrefix: "약국 정보를 불러오지 못했습니다:",
  backButtonLabel: "뒤로",
  pageTitle: "장바구니",
} as const;

export function buildUnavailableBulkChangeAlert(
  unavailableProductNames: string[],
  targetOptionType: string
) {
  return `${unavailableProductNames.join(
    ", "
  )} 상품은 재고가 없어 변경하지 못했고, 나머지 상품만 ${targetOptionType}로 변경했어요.`;
}
