"use client";

import { HOME_PRODUCT_COPY } from "./homeProductSection.copy";

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
    <div className="mx-2 mb-4 mt-1.5 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 sm:mx-0">
      선택하신 상품은 보유 약국 중 주소로부터{" "}
      <strong className="text-sky-500">{distanceLabel}</strong> 거리의{" "}
      <strong className="text-sky-500">{pharmacyName || "-"}</strong>
      에서 주문 가능한 상품들이에요.
    </div>
  );
}

type HomeProductsStatusStateProps = {
  error: string | null;
  isLoading: boolean;
  isRecovering: boolean;
  hasProducts: boolean;
  isCatalogPaused?: boolean;
  onRetry: () => void;
};

export function HomeProductsStatusState({
  error,
  isLoading,
  isRecovering,
  hasProducts,
  isCatalogPaused = false,
  onRetry,
}: HomeProductsStatusStateProps) {
  if (isCatalogPaused && !isLoading) {
    return (
      <section className="mb-12 px-4 py-8">
        <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-7 text-center shadow-[0_20px_48px_-44px_rgba(15,23,42,0.32)]">
          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-white">
            STORE NOTICE
          </span>
          <h2 className="mt-4 text-[1.15rem] font-extrabold tracking-tight text-slate-900">
            {HOME_PRODUCT_COPY.salesPausedTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {HOME_PRODUCT_COPY.salesPausedBody}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {HOME_PRODUCT_COPY.salesPausedHelper}
          </p>
        </div>
      </section>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="mb-12 flex min-h-[30vh] flex-col items-center justify-center py-10">
        <p className="mb-2 text-sm text-gray-500">{error}</p>
        {isRecovering ? (
          <p className="mb-3 text-xs text-gray-400">
            백그라운드에서 자동으로 다시 연결을 시도하고 있어요.
          </p>
        ) : null}
        <button className="text-sm text-sky-500" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!error && !hasProducts && !isLoading) {
    return (
      <div className="mb-12 flex min-h-[30vh] flex-col items-center justify-center gap-6 py-10">
        <p className="text-sm text-gray-500">
          상품 로딩이 지연되고 있어요.
        </p>
        <button className="text-sm text-sky-500" onClick={onRetry}>
          지금 다시 시도
        </button>
      </div>
    );
  }

  return null;
}
