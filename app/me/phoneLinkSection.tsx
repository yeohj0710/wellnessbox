"use client";

import { useCallback, useMemo, useState } from "react";

type LinkState = {
  phone: string | null;
  linkedAt?: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export default function PhoneLinkSection({
  initialPhone,
  initialLinkedAt,
  onLinked,
}: {
  initialPhone?: string;
  initialLinkedAt?: string;
  onLinked?: (phone: string, linkedAt?: string) => void;
}) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState>({
    phone: initialPhone ?? null,
    linkedAt: initialLinkedAt,
  });

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const handleSendOtp = useCallback(async () => {
    if (!normalizedPhone) return;
    setSendLoading(true);
    setSendError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
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
      setSendError((error as Error).message);
    } finally {
      setSendLoading(false);
    }
  }, [normalizedPhone, phone]);

  const handleVerify = useCallback(async () => {
    if (!normalizedPhone || !code) return;
    setVerifyLoading(true);
    setVerifyError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/me/link-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
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

      setLinkState({ phone: data.phone, linkedAt: data.linkedAt });
      onLinked?.(data.phone, data.linkedAt);
      setCode("");
      setStatusMessage("전화번호 인증 및 연동이 완료됐어요.");
    } catch (error) {
      setVerifyError((error as Error).message);
    } finally {
      setVerifyLoading(false);
    }
  }, [code, normalizedPhone, phone]);

  const linkedPhoneDisplay = useMemo(() => {
    if (!linkState.phone) return "연동된 전화번호 없음";
    const digits = linkState.phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return linkState.phone;
  }, [linkState.phone]);

  return (
    <div className="mt-10 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">전화번호 인증</h2>
          <p className="text-sm text-gray-600 mt-1">
            카카오톡 계정과 전화번호를 연동하여 주문 정보를 함께 볼 수 있도록 준비해요.
          </p>
          <p className="text-sm font-semibold text-gray-800 mt-2">
            현재 상태: <span className="text-gray-900">{linkedPhoneDisplay}</span>
          </p>
          {linkState.linkedAt ? (
            <p className="text-xs text-gray-500 mt-1">
              연동 시각: {new Date(linkState.linkedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
            카카오 로그인 상태
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">
            OTP 인증 필요
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">전화번호</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">인증번호</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="수신한 6자리 번호 입력"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendLoading || !normalizedPhone}
            className="flex-1 inline-flex justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {sendLoading ? "발송 중..." : "인증번호 받기"}
          </button>

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyLoading || !normalizedPhone || !code}
            className="flex-1 inline-flex justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {verifyLoading ? "확인 중..." : "인증하고 연동하기"}
          </button>
        </div>

        {statusMessage ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">
            {statusMessage}
          </div>
        ) : null}

        {sendError ? (
          <div className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
            {sendError}
          </div>
        ) : null}

        {verifyError ? (
          <div className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
            {verifyError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
