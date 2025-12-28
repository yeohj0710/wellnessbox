"use client";

import { useEffect, useMemo, useState } from "react";
import PhoneLinkSection from "./phoneLinkSection";
import ConfirmDialog from "./confirmDialog";

type PhoneVerifyModalProps = {
  open: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked: (phone: string, linkedAtValue?: string) => void;

  allowUnlink?: boolean;
  unlinkLoading?: boolean;
  unlinkError?: string | null;
  onUnlink?: () => void | Promise<void>;
};

export default function PhoneVerifyModal({
  open,
  onClose,
  initialPhone,
  initialLinkedAt,
  onLinked,
  allowUnlink = false,
  unlinkLoading = false,
  unlinkError = null,
  onUnlink,
}: PhoneVerifyModalProps) {
  const [linkBusy, setLinkBusy] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  const busy = useMemo(
    () => linkBusy || unlinkLoading,
    [linkBusy, unlinkLoading]
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (busy) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, busy]);

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

            <div className="flex items-center gap-2">
              {allowUnlink ? (
                <button
                  type="button"
                  onClick={() => {
                    if (busy) return;
                    setUnlinkConfirmOpen(true);
                  }}
                  disabled={busy}
                  className="inline-flex min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  해지
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (busy) return;
                  onClose();
                }}
                disabled={busy}
                className="inline-flex min-w-[56px] items-center justify-center whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                닫기
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            결제에 사용한 전화번호를 인증하면 주문 내역을 확인할 수 있어요.
          </div>

          {unlinkError ? (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
              {unlinkError}
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-6 sm:px-7 py-5">
          <PhoneLinkSection
            initialPhone={initialPhone ?? ""}
            initialLinkedAt={initialLinkedAt}
            onBusyChange={setLinkBusy}
            onLinked={(phoneValue, linkedAtValue) => {
              onLinked(phoneValue, linkedAtValue);
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        open={unlinkConfirmOpen}
        title="전화번호 연결 해제"
        description="해지하면 주문 조회를 위해 다시 인증해야 해요. 계속할까요?"
        confirmText="해지"
        cancelText="취소"
        tone="danger"
        confirmLoading={unlinkLoading}
        closeOnBackdrop={true}
        onClose={() => {
          if (!unlinkLoading) setUnlinkConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (unlinkLoading) return;
          try {
            await onUnlink?.();
          } finally {
            setUnlinkConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
