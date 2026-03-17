"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useToast } from "@/components/common/toastContext.client";
import {
  GovernancePreviewSection,
  ModelSelectionSummary,
  ModelSelectField,
  PricingReferenceFootnote,
} from "./modelManager.sections";
import { useModelManager } from "./useModelManager";

export default function ModelManager() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { showToast } = useToast();
  const {
    current,
    options,
    pricingReference,
    governancePreview,
    governanceTaskMap,
    groupedOptions,
    selectedOption,
    loading,
    error,
    updateModel,
  } = useModelManager();

  const handleChange = async (value: string) => {
    const result = await updateModel(value);
    if (!result.ok) return;

    const appliedOption = options.find((option) => option.id === result.appliedModel);
    const appliedLabel = appliedOption?.label || result.appliedModel;
    showToast(`${appliedLabel} 기본 모델로 반영됐어요.`, {
      type: "success",
      duration: 3200,
      toastKey: "admin-model-selection",
    });
  };

  const selectedLabel = selectedOption?.label || current;

  return (
    <div className="space-y-4 rounded-2xl border border-sky-100 bg-white/80 p-4">
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-slate-800">
          기본 모델 선택
        </label>
        <p className="text-xs text-slate-500">
          여기서 고른 모델이 상담, 제안, 리포트 분석, 요약 작업에 그대로 적용됩니다.
        </p>
      </div>

      <ModelSelectField
        current={current}
        groupedOptions={groupedOptions}
        loading={loading}
        disabled={options.length === 0}
        onChange={handleChange}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50/80">
        <button
          type="button"
          onClick={() => setDetailsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-100/70"
          aria-expanded={detailsOpen}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-slate-800">모델 상세</p>
            <p className="truncate text-xs text-slate-500">
              현재 {selectedLabel}
              {governancePreview.length > 0
                ? ` · 작업별 라우팅 ${governancePreview.length}개`
                : ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            {detailsOpen ? "접기" : "상세 보기"}
            {detailsOpen ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </span>
        </button>

        {detailsOpen ? (
          <div className="space-y-3 border-t border-slate-200 px-4 py-4">
            <ModelSelectionSummary selectedOption={selectedOption} />

            <GovernancePreviewSection
              governancePreview={governancePreview}
              governanceTaskMap={governanceTaskMap}
            />

            <PricingReferenceFootnote pricingReference={pricingReference} />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
