"use client";

import { InformationCircleIcon } from "@heroicons/react/24/solid";
import ModalLayer from "@/components/common/modalLayer";

type CheckoutPausedModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function CheckoutPausedModal({
  visible,
  onClose,
}: CheckoutPausedModalProps) {
  if (!visible) return null;

  return (
    <ModalLayer open={visible}>
      <div className="fixed inset-0 z-[60] grid place-items-center p-4">
        <div
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-paused-title"
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-2xl"
        >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300" />
        <div className="px-6 pb-6 pt-8 sm:px-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <InformationCircleIcon className="h-8 w-8 text-amber-600" />
          </div>

          <h2
            id="checkout-paused-title"
            className="mt-5 text-center text-xl font-semibold text-slate-900"
          >
            상품 판매가 잠시 중단되었어요
          </h2>

          <div className="mt-4 space-y-3 text-center text-sm leading-6 text-slate-600">
            <p>
              현재 WellnessBox 상품 결제는 리뉴얼 진행으로 인해 잠시 중단되어
              있어요.
            </p>
            <p>판매는 곧 다시 재개될 예정입니다. 조금만 기다려 주세요.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
          >
            확인
          </button>
        </div>
        </div>
      </div>
    </ModalLayer>
  );
}
