"use client";

import {
  describeGovernancePolicy,
  formatRelativePercent,
  formatUsd,
  type ChatModelOption,
  type GovernancePreviewItem,
  type GovernanceTaskOption,
  type PricingReference,
} from "./useModelManager";

export function ModelSelectField({
  current,
  groupedOptions,
  loading,
  disabled,
  onChange,
}: {
  current: string;
  groupedOptions: Array<[string, ChatModelOption[]]>;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
      value={current}
      onChange={(event) => onChange(event.target.value)}
      disabled={loading || disabled}
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
  );
}

export function ModelSelectionSummary({
  selectedOption,
}: {
  selectedOption: ChatModelOption | null;
}) {
  if (!selectedOption) return null;

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-800">
        선택 모델: {selectedOption.label} ({selectedOption.id})
      </p>
      <p className="mt-1 text-xs text-slate-600">{selectedOption.description}</p>
      <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
        <p>입력 비용: {formatUsd(selectedOption.inputUsdPer1M)}</p>
        <p>출력 비용: {formatUsd(selectedOption.outputUsdPer1M)}</p>
        <p className="font-semibold text-sky-700">
          4o-mini 대비 {formatRelativePercent(selectedOption.relativeCostPercent)}
        </p>
      </div>
      {selectedOption.isLegacy ? (
        <p className="mt-2 text-xs text-amber-700">
          레거시 모델은 호환용으로만 남아 있고, 운영 환경에서는 가급적 비권장입니다.
        </p>
      ) : null}
    </div>
  );
}

export function GovernancePreviewSection({
  governancePreview,
  governanceTaskMap,
}: {
  governancePreview: GovernancePreviewItem[];
  governanceTaskMap: Map<string, GovernanceTaskOption>;
}) {
  if (governancePreview.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">실제 라우팅 미리보기</p>
        <p className="text-xs text-slate-500">
          현재 선택한 모델이 각 작업에 어떻게 반영되는지 빠르게 확인할 수 있습니다.
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {governancePreview.map((item) => {
          const task = governanceTaskMap.get(item.task);
          return (
            <div
              key={item.task}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.purpose}</p>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {describeGovernancePolicy(task)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  기본: {item.configuredModel}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">
                  실제: {item.resolvedModel}
                </span>
              </div>
              {item.reasoning[0] ? (
                <p className="mt-2 text-xs text-slate-600">{item.reasoning[0]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PricingReferenceFootnote({
  pricingReference,
}: {
  pricingReference: PricingReference | null;
}) {
  if (!pricingReference) return null;

  return (
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
  );
}
