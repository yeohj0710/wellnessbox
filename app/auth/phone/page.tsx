"use client";

import { useCallback, useMemo, useState } from "react";

interface ApiResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export default function PhoneAuthPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendResponse, setSendResponse] = useState<ApiResponse | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<ApiResponse | null>(
    null
  );
  const [verifyStatusCode, setVerifyStatusCode] = useState<number | null>(null);

  const handleSendOtp = useCallback(async () => {
    if (!phone) return;
    setSendLoading(true);
    setSendResponse(null);

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

      setSendResponse({
        status: res.status,
        ...data,
        ok: res.ok && data.ok !== false,
      });
    } catch (error) {
      setSendResponse({ ok: false, error: (error as Error).message });
    } finally {
      setSendLoading(false);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    if (!phone || !code) return;
    setVerifyLoading(true);
    setVerifyResponse(null);
    setVerifyStatusCode(null);

    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const raw = await res.text();
      let data: ApiResponse;

      try {
        data = raw ? (JSON.parse(raw) as ApiResponse) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      setVerifyResponse({
        status: res.status,
        ...data,
        ok: res.ok && data.ok !== false,
      });
      setVerifyStatusCode(res.status);
    } catch (error) {
      setVerifyResponse({ ok: false, error: (error as Error).message });
    } finally {
      setVerifyLoading(false);
    }
  }, [phone, code]);

  const verifyHint = useMemo(() => {
    if (verifyStatusCode == null) return undefined;
    if (verifyStatusCode === 200) return undefined;
    return "인증번호 확인이 실패했습니다. 응답 내용을 확인해주세요.";
  }, [verifyStatusCode]);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-8 space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              휴대폰 OTP 테스트
            </h1>
            <p className="text-sm text-gray-600">
              휴대폰 번호와 인증번호를 입력해 OTP 발송 및 확인을 테스트하세요.
            </p>
          </header>

          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-800">
                휴대폰 번호
              </span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-800">
                인증번호
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="발송된 인증번호 입력"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendLoading || !phone}
              className="inline-flex justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {sendLoading ? "발송 중..." : "인증번호 받기"}
            </button>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyLoading || !phone || !code}
              className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {verifyLoading ? "확인 중..." : "인증번호 확인"}
            </button>
          </div>

          <div className="space-y-4">
            <ResponsePanel title="발송 응답" response={sendResponse} />
            <ResponsePanel
              title="확인 응답"
              response={verifyResponse}
              hint={verifyHint}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsePanel({
  title,
  response,
  hint,
}: {
  title: string;
  response: ApiResponse | null;
  hint?: string;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {response ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              response.ok
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {response.ok ? "성공" : "실패"}
          </span>
        ) : (
          <span className="text-xs text-gray-500">대기 중</span>
        )}
      </div>
      {hint ? <p className="text-xs text-amber-700">{hint}</p> : null}
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-gray-800 shadow-inner ring-1 ring-gray-200">
        {response
          ? JSON.stringify(response, null, 2)
          : "응답을 확인하려면 요청을 보내세요."}
      </pre>
    </section>
  );
}
