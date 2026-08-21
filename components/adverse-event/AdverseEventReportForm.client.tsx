"use client";

import { useState } from "react";

type Severity = "MILD" | "MODERATE" | "SERIOUS";

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string; hint: string }> = [
  { value: "MILD", label: "가벼움", hint: "불편했지만 그냥 지나갔어요" },
  { value: "MODERATE", label: "보통", hint: "생활에 지장이 있었어요" },
  { value: "SERIOUS", label: "심함", hint: "병원에 갔거나 갈 정도였어요" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";
const labelClass = "block text-sm font-semibold text-slate-900";

export default function AdverseEventReportForm() {
  const [severity, setSeverity] = useState<Severity | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    const form = new FormData(event.currentTarget);
    const contactEmail = String(form.get("contactEmail") ?? "").trim();
    const contactPhone = String(form.get("contactPhone") ?? "").trim();
    const privacyConsented = form.get("privacyConsented") === "on";

    if (!severity) {
      setError("증상이 어느 정도였는지 골라 주세요.");
      return;
    }
    if ((contactEmail || contactPhone) && !privacyConsented) {
      setError("연락처를 남기시려면 개인정보 수집에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/adverse-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: String(form.get("productName") ?? ""),
          symptomText: String(form.get("symptomText") ?? ""),
          severity,
          onsetAt: String(form.get("onsetAt") ?? ""),
          stillTaking: form.get("stillTaking") === "on",
          relatedToRecommendation: form.get("relatedToRecommendation") === "on",
          orderId: String(form.get("orderId") ?? ""),
          contactEmail,
          contactPhone,
          privacyConsented,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "신고를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setDoneId(String(payload.id));
    } catch {
      setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (doneId) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-base font-bold text-emerald-900">접수했습니다</p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          약사가 확인하고, 연락처를 남기셨다면 필요할 때 연락드립니다.
        </p>
        <p className="mt-3 text-xs text-emerald-700">접수번호 {doneId}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className={labelClass} htmlFor="productName">
          드신 제품 이름
        </label>
        <input
          id="productName"
          name="productName"
          required
          maxLength={200}
          placeholder="예: 오메가3, 유산균"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="symptomText">
          어떤 증상이 있었나요
        </label>
        <textarea
          id="symptomText"
          name="symptomText"
          required
          rows={5}
          maxLength={2000}
          placeholder="언제부터 어떤 증상이 있었는지 편하게 적어 주세요."
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>증상이 어느 정도였나요</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SEVERITY_OPTIONS.map((option) => {
            const selected = severity === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSeverity(option.value)}
                aria-pressed={selected}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-sky-400 bg-sky-50 ring-2 ring-sky-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="onsetAt">
            증상이 생긴 날 (선택)
          </label>
          <input id="onsetAt" name="onsetAt" type="date" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="orderId">
            주문번호 (선택)
          </label>
          <input
            id="orderId"
            name="orderId"
            maxLength={100}
            placeholder="아시면 적어 주세요"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="stillTaking" className="mt-1" />
          <span>지금도 그 제품을 드시고 있어요</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="relatedToRecommendation" className="mt-1" />
          <span>웰니스박스가 추천해서 드신 제품이에요</span>
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-900">
          연락처 (선택)
        </p>
        <p className="text-xs leading-5 text-slate-500">
          더 여쭤볼 게 있을 때만 씁니다. 안 남기셔도 접수됩니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="contactEmail">
              메일
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="contactPhone">
              전화번호
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              maxLength={200}
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="privacyConsented" className="mt-1" />
          <span>
            연락을 위해 남긴 연락처를 보관하는 데 동의합니다. 확인이 끝나면 지웁니다.
          </span>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-sky-600 px-6 py-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {submitting ? "보내는 중" : "신고 보내기"}
      </button>
    </form>
  );
}
