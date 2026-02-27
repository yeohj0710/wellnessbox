"use client";

import ModalSpinner from "./modalSpinner";
import { usePhoneLinkSectionState } from "./usePhoneLinkSectionState";

type PhoneLinkSectionProps = {
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked?: (phone: string, linkedAt?: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function PhoneLinkSection({
  initialPhone,
  initialLinkedAt,
  onLinked,
  onBusyChange,
}: PhoneLinkSectionProps) {
  const {
    phoneDisplay,
    code,
    sendLoading,
    verifyLoading,
    sendError,
    verifyError,
    statusMessage,
    otpSent,
    phoneLocked,
    busy,
    sendDisabled,
    verifyDisabled,
    handlePhoneChange,
    handleCodeChange,
    handleSendOtp,
    handleVerify,
    handleEditPhone,
  } = usePhoneLinkSectionState({
    initialPhone,
    initialLinkedAt,
    onLinked,
    onBusyChange,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-900">전화번호</div>

        <div className="flex items-center gap-3">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phoneDisplay}
            disabled={busy || phoneLocked}
            onChange={(event) => handlePhoneChange(event.target.value)}
            placeholder="010-1234-5678"
            className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
          />

          {phoneLocked ? (
            <button
              type="button"
              onClick={handleEditPhone}
              disabled={busy}
              className="shrink-0 w-20 h-8 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              번호 수정
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendDisabled}
            aria-busy={sendLoading}
            className="shrink-0 w-16 h-8 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
          >
            <span className="grid h-full w-full place-items-center">
              {sendLoading ? (
                <ModalSpinner className="text-white" />
              ) : otpSent ? (
                "재발송"
              ) : (
                "발송"
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
            onChange={(event) => handleCodeChange(event.target.value)}
            placeholder="6자리 번호"
            className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
          />

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyDisabled}
            aria-busy={verifyLoading}
            className="shrink-0 w-16 h-8 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
          >
            <span className="grid h-full w-full place-items-center">
              {verifyLoading ? <ModalSpinner className="text-white" /> : "인증"}
            </span>
          </button>
        </div>

        {!otpSent ? (
          <p className="text-xs text-gray-600">
            먼저 인증번호를 발송하고, 문자로 받은 6자리 번호를 입력해 주세요.
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
  );
}
