"use client";

type SelectedPharmacyNoticeProps = {
  visible: boolean;
  pharmacyName?: string;
  distanceKm?: number | null;
};

export function SelectedPharmacyNotice({
  visible,
  pharmacyName,
  distanceKm,
}: SelectedPharmacyNoticeProps) {
  if (!visible) return null;

  const distanceLabel =
    typeof distanceKm === "number" && Number.isFinite(distanceKm)
      ? `${distanceKm.toFixed(1)}km`
      : "-";

  return (
    <div className="mx-2 sm:mx-0 bg-gray-100 px-3 py-2 mt-1.5 mb-4 rounded-md text-sm text-gray-700">
      선택하신 상품을 보유한 약국 중 주소로부터{" "}
      <strong className="text-sky-500">{distanceLabel}</strong>{" "}
      거리에 위치한{" "}
      <strong className="text-sky-500">{pharmacyName || "-"}</strong>
      의 상품들이에요.
    </div>
  );
}

type HomeProductsStatusStateProps = {
  error: string | null;
  isLoading: boolean;
  isRecovering: boolean;
  hasProducts: boolean;
  onRetry: () => void;
};

export function HomeProductsStatusState({
  error,
  isLoading,
  isRecovering,
  hasProducts,
  onRetry,
}: HomeProductsStatusStateProps) {
  if (error && !isLoading) {
    return (
      <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center py-10">
        <p className="text-gray-500 text-sm mb-2">{error}</p>
        {isRecovering ? (
          <p className="text-xs text-gray-400 mb-3">
            백그라운드에서 자동 재시도 중입니다.
          </p>
        ) : null}
        <button className="text-sky-500 text-sm" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!error && !hasProducts && !isLoading) {
    return (
      <div className="min-h-[30vh] mb-12 flex flex-col items-center justify-center gap-6 py-10">
        <p className="text-sm text-gray-500">
          상품 로딩이 지연되고 있어요.
        </p>
        <button className="text-sky-500 text-sm" onClick={onRetry}>
          지금 다시 시도
        </button>
      </div>
    );
  }

  return null;
}
