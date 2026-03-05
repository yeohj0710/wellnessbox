"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

type ChatModelOption = {
  id: string;
  label: string;
  family: string;
  description: string;
  inputUsdPer1M: number | null;
  outputUsdPer1M: number | null;
  relativeCostPercent: number | null;
  isLegacy?: boolean;
};

type PricingReference = {
  baselineModel: string;
  baselineLabel: string;
  sourceUrl: string;
  updatedAt: string;
  note: string;
};

type ModelApiResponse = {
  model: string;
  options?: ChatModelOption[];
  pricingReference?: PricingReference;
};

const FAMILY_LABELS: Record<string, string> = {
  "gpt-5": "GPT-5 계열",
  "o-series": "추론 모델 (o-series)",
  "gpt-4.1": "GPT-4.1 계열",
  "gpt-4o": "GPT-4o 계열",
  legacy: "레거시 호환",
};

function formatUsd(value: number | null) {
  if (value === null) return "정보 없음";
  return `$${value.toFixed(2)} / 1M tokens`;
}

function formatRelativePercent(value: number | null) {
  if (value === null) return "가격 정보 없음";
  return `${value}%`;
}

export default function ModelManager() {
  const [current, setCurrent] = useState(DEFAULT_CHAT_MODEL);
  const [options, setOptions] = useState<ChatModelOption[]>([]);
  const [pricingReference, setPricingReference] = useState<PricingReference | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/model");
        if (!response.ok) throw new Error("모델 설정을 불러오지 못했습니다.");

        const payload = (await response.json()) as ModelApiResponse;
        if (!active) return;

        if (payload.model) setCurrent(payload.model);
        if (Array.isArray(payload.options)) setOptions(payload.options);
        if (payload.pricingReference) {
          setPricingReference(payload.pricingReference);
        }
      } catch {
        if (!active) return;
        setError("모델 목록을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const groupedOptions = useMemo(() => {
    const group = new Map<string, ChatModelOption[]>();
    for (const option of options) {
      const familyLabel = FAMILY_LABELS[option.family] ?? option.family;
      const list = group.get(familyLabel) ?? [];
      list.push(option);
      group.set(familyLabel, list);
    }
    return Array.from(group.entries());
  }, [options]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === current) ?? null,
    [current, options]
  );

  async function updateModel(value: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: value }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "모델 저장에 실패했습니다.");
      }

      const payload = (await response.json()) as { model?: string };
      setCurrent(payload.model || value);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "모델 저장에 실패했습니다. 다시 시도해 주세요.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-sky-100 bg-white/80 p-4">
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-slate-800">기본 모델 선택</label>
        <p className="text-xs text-slate-500">
          관리자에서 선택한 모델이 챗봇/제안/리포트 분석/하이픈 요약/에이전트 실행에 공통
          적용됩니다.
        </p>
      </div>

      <select
        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        value={current}
        onChange={(event) => updateModel(event.target.value)}
        disabled={loading || options.length === 0}
      >
        {groupedOptions.map(([familyLabel, familyOptions]) => (
          <optgroup key={familyLabel} label={familyLabel}>
            {familyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.id}) · {formatRelativePercent(option.relativeCostPercent)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedOption ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">
            선택 모델: {selectedOption.label} ({selectedOption.id})
          </p>
          <p className="mt-1 text-xs text-slate-600">{selectedOption.description}</p>
          <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
            <p>입력 단가: {formatUsd(selectedOption.inputUsdPer1M)}</p>
            <p>출력 단가: {formatUsd(selectedOption.outputUsdPer1M)}</p>
            <p className="font-semibold text-sky-700">
              4o-mini 대비: {formatRelativePercent(selectedOption.relativeCostPercent)}
            </p>
          </div>
          {selectedOption.isLegacy ? (
            <p className="mt-2 text-xs text-amber-700">
              레거시 모델은 품질/호환성 이슈가 있어 운영 환경에서는 비권장입니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {pricingReference ? (
        <p className="text-[11px] text-slate-500">
          가격 기준: {pricingReference.baselineLabel}={pricingReference.baselineModel}(100),{" "}
          {pricingReference.updatedAt} 기준,{" "}
          <a
            className="text-sky-700 underline underline-offset-2"
            href={pricingReference.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            OpenAI 공식 모델 문서
          </a>
        </p>
      ) : null}

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
