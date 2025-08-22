"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/solid";

interface CheckoutConfirmModalProps {
  visible: boolean;
  roadAddress: string;
  detailAddress: string;
  userContact: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CheckoutConfirmModal({
  visible,
  roadAddress,
  detailAddress,
  userContact,
  onCancel,
  onConfirm,
}: CheckoutConfirmModalProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md origin-center rounded-3xl p-1 shadow-2xl transition-all bg-gradient-to-br from-sky-400/70 via-indigo-500/60 to-fuchsia-500/60 max-h-[90vh] overflow-hidden"
      >
        <div className="rounded-3xl bg-white max-h-[90vh]">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute -top-20 -right-16 h-48 w-48 rounded-full bg-sky-100 blur-2xl" />
            <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-indigo-100 blur-2xl" />
            <div className="relative px-6 pb-6 pt-8 overflow-y-auto max-h-[78vh]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                <ExclamationTriangleIcon className="h-7 w-7 text-sky-600" />
              </div>
              <h2 className="text-center text-xl font-semibold text-gray-900">
                주소와 연락처가 확실한가요?
              </h2>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                  <div className="w-10 flex items-center justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-inner">
                      <MapPinIcon className="h-5 w-5 text-sky-600" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">주소</div>
                    <div className="text-sm font-semibold text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                      {roadAddress} {detailAddress}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                  <div className="w-10 flex items-center justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-inner">
                      <PhoneIcon className="h-5 w-5 text-sky-600" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">연락처</div>
                    <div className="text-sm font-semibold text-gray-800 break-words leading-relaxed">
                      {userContact}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sticky bottom-0">
                <button
                  onClick={onCancel}
                  className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.99]"
                >
                  취소
                </button>
                <button
                  onClick={onConfirm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-semibold text-white transition hover:bg-sky-600 active:scale-[0.99]"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
