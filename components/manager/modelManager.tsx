"use client";

import { useToast } from "@/components/common/toastContext.client";
import {
  GovernancePreviewSection,
  ModelSelectionSummary,
  ModelSelectField,
  PricingReferenceFootnote,
} from "./modelManager.sections";
import { useModelManager } from "./useModelManager";

export default function ModelManager() {
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
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-sky-100 bg-white/80 p-4">
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-slate-800">
          기본 모델 선택
        </label>
        <p className="text-xs text-slate-500">
          여기서 고른 모델은 기본값이고 실제 호출은 작업별 거버넌스 기준에 따라 더 가볍게
          내려가거나 안전하게 상향될 수 있습니다.
        </p>
      </div>

      <ModelSelectField
        current={current}
        groupedOptions={groupedOptions}
        loading={loading}
        disabled={options.length === 0}
        onChange={handleChange}
      />

      <ModelSelectionSummary selectedOption={selectedOption} />

      <GovernancePreviewSection
        governancePreview={governancePreview}
        governanceTaskMap={governanceTaskMap}
      />

      <PricingReferenceFootnote pricingReference={pricingReference} />

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
