export const HOME_PACKAGE_LABELS = {
  all: "전체",
  days7: "7일 패키지",
  days30: "30일 패키지",
  normal: "일반 상품",
} as const;

export const HOME_PRODUCT_COPY = {
  movedToProductSection: "상품 섹션으로 이동했어요.",
  connectionSlowUsingCache:
    "연결이 느려 캐시된 상품을 먼저 보여드리고 있어요.",
  loadingTimeout: "상품을 불러오는 시간이 길어지고 있어요. 다시 시도해 주세요.",
  loadFailed: "상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  pharmacyAddressRequired:
    "주소를 설정해 주세요. 해당 상품을 주문할 수 있는 약국을 찾아드릴게요.",
  noNearbyStockAlert:
    "선택하신 상품의 재고를 가진 주변 약국을 찾지 못해 해당 상품을 장바구니에서 제외했어요.",
  noNearbyStockError: "주변 약국에서 해당 상품 재고를 찾지 못했어요.",
  pharmacyLoadFailed:
    "주변 약국 정보를 불러오지 못했어요. 다시 시도해 주세요.",
} as const;

export function resolvePackageFromQueryParam(value: string | null) {
  if (value === "7") return HOME_PACKAGE_LABELS.days7;
  if (value === "30") return HOME_PACKAGE_LABELS.days30;
  if (value === "normal") return HOME_PACKAGE_LABELS.normal;
  return null;
}
