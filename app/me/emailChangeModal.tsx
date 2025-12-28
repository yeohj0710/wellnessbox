"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse = { ok?: boolean; error?: string; email?: string };

type EmailChangeModalProps = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  onChanged: (email: string) => void;
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

function isEmailValid(value: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim()) && value.trim().length <= 120;
}

export default function EmailChangeModal({
  open,
  onClose,
  initialEmail,
  onChanged,
}: EmailChangeModalProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const busy = useMemo(() => sendLoading || verifyLoading, [sendLoading, verifyLoading]);
  const cooldownRemaining = useMemo(
    () => (cooldownEndsAt ? Math.max(0, cooldownEndsAt - now) : 0),
    [cooldownEndsAt, now]
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [open]);

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

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail ?? "");
    setCode("");
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);
    setOtpSent(false);
    setCooldownEndsAt(null);
  }, [open, initialEmail]);

  const sendDisabled =
    !isEmailValid(email) || busy || cooldownRemaining > 0;
  const verifyDisabled = busy || !otpSent || code.trim().length === 0;

  const handleSend = async () => {
    if (sendDisabled) return;

    setSendLoading(true);
    setSendError(null);
    setVerifyError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

      setOtpSent(true);
      setStatusMessage("인증번호를 전송했어요. 메일함을 확인해 주세요.");
      setCooldownEndsAt(Date.now() + 60_000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyDisabled) return;

    setVerifyLoading(true);
    setVerifyError(null);
    setSendError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const raw = await res.text();
      let data: ApiResponse;

      try {
        data = raw ? (JSON.parse(raw) as ApiResponse) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false || !data.email) {
        setVerifyError(data?.error || "이메일 인증에 실패했어요.");
        return;
      }

      onChanged(data.email);
      setStatusMessage("이메일이 변경되었어요.");
      setOtpSent(false);
      setCode("");
      onClose();
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setVerifyLoading(false);
    }
  };

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

        <div className="border-t border-gray-200 px-6 sm:px-7 py-5 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">이메일</div>
            <div className="flex items-center gap-3">
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                aria-busy={sendLoading}
                className="shrink-0 w-24 h-10 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                <span className="grid h-full w-full place-items-center">
                  {sendLoading ? (
                    <Spinner className="text-white" />
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
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6자리 번호"
                className="min-w-0 flex-1 h-10 rounded-lg border border-gray-300 px-3 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyDisabled}
                aria-busy={verifyLoading}
                className="shrink-0 w-24 h-10 rounded-lg bg-sky-400 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                <span className="grid h-full w-full place-items-center">
                  {verifyLoading ? <Spinner className="text-white" /> : "인증"}
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
