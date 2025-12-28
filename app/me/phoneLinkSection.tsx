"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

function formatPhoneKR(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 11);

  if (d.length <= 3) return d;

  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }

  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function PhoneLinkSection({
  initialPhone,
  initialLinkedAt,
  onLinked,
  onBusyChange,
}: {
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked?: (phone: string, linkedAt?: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [phoneDigits, setPhoneDigits] = useState(() =>
    (initialPhone ?? "").replace(/\D/g, "").slice(0, 11)
  );
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedPhone = phoneDigits;
  const phoneDisplay = useMemo(() => formatPhoneKR(phoneDigits), [phoneDigits]);

  const isPhoneValid =
    normalizedPhone.length >= 9 && normalizedPhone.length <= 11;

  const busy = sendLoading || verifyLoading;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (busy) return;
    setPhoneDigits((initialPhone ?? "").replace(/\D/g, "").slice(0, 11));
    setCode("");
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);
  }, [initialPhone, initialLinkedAt, busy]);

  const handleSendOtp = useCallback(async () => {
    if (!isPhoneValid || busy) return;

    setSendLoading(true);
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const raw = await res.text();
      let data: ApiResponse;

      try {
        data = raw ? (JSON.parse(raw) as ApiResponse) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setSendError(data?.error || "인증번호 발송에 실패했어요.");
        return;
      }

      setStatusMessage("인증번호를 전송했어요. 문자 메시지를 확인해 주세요.");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      setSendLoading(false);
    }
  }, [isPhoneValid, normalizedPhone, busy]);

  const handleVerify = useCallback(async () => {
    if (!isPhoneValid || code.length === 0 || busy) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setSendError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/me/link-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code }),
      });

      const raw = await res.text();
      let data: ApiResponse & { phone?: string; linkedAt?: string };

      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false || !data.phone) {
        setVerifyError(data?.error || "전화번호 인증에 실패했어요.");
        return;
      }

      onLinked?.(data.phone, data.linkedAt);
      setCode("");
      setStatusMessage("인증이 완료됐어요.");
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setVerifyLoading(false);
    }
  }, [code, isPhoneValid, normalizedPhone, onLinked, busy]);

  const sendDisabled = busy || !isPhoneValid;
  const verifyDisabled = busy || !isPhoneValid || code.length === 0;

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
            disabled={busy}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              setPhoneDigits(digits);
            }}
            placeholder="010-1234-5678"
            className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
          />

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendDisabled}
            aria-busy={sendLoading}
            className="shrink-0 w-16 h-8 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
          >
            <span className="grid h-full w-full place-items-center">
              {sendLoading ? <Spinner className="text-white" /> : "발송"}
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
            disabled={busy}
            maxLength={6}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
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
              {verifyLoading ? <Spinner className="text-white" /> : "인증"}
            </span>
          </button>
        </div>
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
