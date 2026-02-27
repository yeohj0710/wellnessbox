"use client";

import { useDraggableModal } from "@/components/common/useDraggableModal";
import ModalSpinner from "./modalSpinner";
import { useEmailChangeModalState } from "./useEmailChangeModalState";

type EmailChangeModalProps = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  onChanged: (email: string) => void;
};

export default function EmailChangeModal({
  open,
  onClose,
  initialEmail,
  onChanged,
}: EmailChangeModalProps) {
  const {
    email,
    code,
    sendLoading,
    verifyLoading,
    sendError,
    verifyError,
    statusMessage,
    otpSent,
    busy,
    cooldownRemaining,
    sendDisabled,
    verifyDisabled,
    setEmail,
    setCode,
    handleSend,
    handleVerify,
  } = useEmailChangeModalState({
    open,
    initialEmail,
    onClose,
    onChanged,
  });

  const { panelRef, panelStyle, handleDragPointerDown, isDragging } =
    useDraggableModal(open, { resetOnOpen: true });

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
        ref={panelRef}
        style={panelStyle}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 sm:px-7 py-5">
          <div
            className={`flex items-center justify-between gap-3 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handleDragPointerDown}
          >
            <div className="text-xl font-bold text-gray-900">이메일 변경</div>

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

          <div className="mt-2 text-sm text-gray-600">
            새로운 이메일 주소로 인증번호를 받아 변경할 수 있어요.
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-200 px-6 py-5 sm:px-7">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">이메일</div>
            <div className="flex items-center gap-3">
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@email.com"
                className="min-w-0 h-10 flex-1 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                aria-busy={sendLoading}
                className="h-10 w-24 shrink-0 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                <span className="grid h-full w-full place-items-center">
                  {sendLoading ? (
                    <ModalSpinner className="text-white" />
                  ) : cooldownRemaining > 0 ? (
                    `${Math.ceil(cooldownRemaining / 1000)}초 후`
                  ) : otpSent ? (
                    "재발송"
                  ) : (
                    "코드 발송"
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">인증번호</div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                disabled={busy || !otpSent}
                maxLength={6}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6자리 번호"
                className="min-w-0 h-10 flex-1 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyDisabled}
                aria-busy={verifyLoading}
                className="h-10 w-24 shrink-0 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                <span className="grid h-full w-full place-items-center">
                  {verifyLoading ? <ModalSpinner className="text-white" /> : "인증"}
                </span>
              </button>
            </div>
            {!otpSent ? (
              <p className="text-xs text-gray-600">
                이메일로 받은 인증번호 6자리를 입력해 주세요.
              </p>
            ) : null}
          </div>

          {statusMessage ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
              {statusMessage}
            </div>
          ) : null}

          {sendError ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
              {sendError}
            </div>
          ) : null}

          {verifyError ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
              {verifyError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
