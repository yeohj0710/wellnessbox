"use client";

import { useEffect, useState } from "react";
import PhoneLinkSection from "./phoneLinkSection";

type PhoneVerifyModalProps = {
  open: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked: (phone: string, linkedAtValue?: string) => void;
};

export default function PhoneVerifyModal({
  open,
  onClose,
  initialPhone,
  initialLinkedAt,
  onLinked,
}: PhoneVerifyModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isBusy) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isBusy]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 sm:px-7 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xl font-bold text-gray-900">전화번호 인증</div>

            <button
              type="button"
              onClick={() => {
                if (isBusy) return;
                onClose();
              }}
              disabled={isBusy}
              className="inline-flex min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              닫기
            </button>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            결제에 사용한 전화번호를 인증하면 주문 내역을 확인할 수 있어요.
          </div>

          {isBusy ? (
            <div className="mt-2 text-xs font-semibold text-gray-500">
              처리 중에는 닫을 수 없어요.
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-6 sm:px-7 py-5">
          <PhoneLinkSection
            initialPhone={initialPhone ?? ""}
            initialLinkedAt={initialLinkedAt}
            onBusyChange={setIsBusy}
            onLinked={(phoneValue, linkedAtValue) => {
              onLinked(phoneValue, linkedAtValue);
            }}
          />
        </div>
      </div>
    </div>
  );
}
