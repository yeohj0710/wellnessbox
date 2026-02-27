"use client";

import LoadingOverlay from "./LoadingOverlay";
import CSectionOptionGrid from "./CSectionOptionGrid";
import { type CSectionResultPayload } from "./cSection.helpers";
import useCSectionController, { C_SECTION_COPY } from "./useCSectionController";

export type CSectionResult = CSectionResultPayload;

type CSectionProps = {
  cats: string[];
  onSubmit: (res: CSectionResult, answers: Record<string, number[]>) => void;
  onProgress?: (step: number, total: number) => void;
  registerPrev?: (fn: () => boolean) => void;
  persistKey?: string;
  onLoadingChange?: (loading: boolean, text?: string) => void;
};

export default function CSection({
  cats,
  onSubmit,
  onProgress,
  registerPrev,
  persistKey,
  onLoadingChange,
}: CSectionProps) {
  const {
    cat,
    qIdx,
    question,
    options,
    error,
    submitting,
    transitioning,
    isActive,
    select,
    skipCurrent,
  } = useCSectionController({
    cats,
    onSubmit,
    onProgress,
    registerPrev,
    persistKey,
    onLoadingChange,
  });

  return (
    <div className="relative">
      {!onLoadingChange && submitting ? (
        <LoadingOverlay text={C_SECTION_COPY.submitText} />
      ) : null}
      {!onLoadingChange && transitioning ? (
        <LoadingOverlay text={C_SECTION_COPY.transitionText} />
      ) : null}

      <h2 className="mt-6 text-xl font-bold text-gray-900">{question?.prompt}</h2>

      <CSectionOptionGrid
        cat={cat}
        qIdx={qIdx}
        options={options}
        disabled={transitioning || submitting}
        isActive={isActive}
        onSelect={select}
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 flex items-center justify-between gap-2">
        <p className="flex-1 min-w-0 truncate text-xs leading-none text-gray-400">
          {C_SECTION_COPY.skipHintText}
        </p>
        <button
          onClick={skipCurrent}
          type="button"
          className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          disabled={submitting || transitioning}
        >
          {C_SECTION_COPY.skipButtonText}
        </button>
      </div>
    </div>
  );
}
