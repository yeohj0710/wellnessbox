export const HOME_PACKAGE_LABELS = {
  all: "전체",
  days7: "7일 패키지",
  days30: "30일 패키지",
  normal: "일반 상품",
} as const;

export const HOME_PRODUCT_COPY = {
  movedToProductSection: "상품 섹션으로 이동했어요.",
  connectionSlowUsingCache:
    "연결이 느려서 캐시에 있는 상품부터 먼저 보여드리고 있어요.",
  loadingTimeout:
    "상품을 불러오는 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.",
  loadFailed: "상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  salesPausedTitle: "현재는 상품 판매를 진행하지 않고 있어요.",
  salesPausedBody:
    "추천과 안내 흐름은 계속 다듬고 있지만, 지금은 구매 가능한 상품 구성을 열어두지 않았어요. 판매가 다시 열리면 이 자리에서 자연스럽게 이어서 보실 수 있어요.",
  salesPausedHelper:
    "대신 AI 체크, 설문, 상담처럼 방향을 먼저 잡는 기능은 계속 이용하실 수 있어요.",
  pharmacyAddressRequired:
    "주소를 설정해 주세요. 해당 상품을 주문할 수 있는 주변 약국을 찾아드릴게요.",
  noNearbyStockAlert:
    "선택하신 상품의 재고를 가진 주변 약국을 찾지 못해 해당 상품은 장바구니에서 제외되었어요.",
  noNearbyStockError:
    "주변 약국에서 해당 상품 재고를 찾지 못했어요.",
  pharmacyLoadFailed:
    "주변 약국 정보를 불러오지 못했어요. 다시 시도해 주세요.",
} as const;

export function resolvePackageFromQueryParam(value: string | null) {
  if (value === "7") return HOME_PACKAGE_LABELS.days7;
  if (value === "30") return HOME_PACKAGE_LABELS.days30;
  if (value === "normal") return HOME_PACKAGE_LABELS.normal;
  return null;
}
