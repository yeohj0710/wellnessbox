"use client";

import LoadingOverlay from "./LoadingOverlay";
import CSection, { CSectionResult } from "./CSection";

interface Props {
  loading: boolean;
  loadingText: string;
  onPrev: () => void;
  onReset: () => void;
  cCats: string[];
  cProgress: { step: number; total: number; pct: number };
  cProgressMsg: string;
  cEpoch: number;
  onSubmit: (res: CSectionResult, answers: Record<string, number[]>) => void;
  onProgress: (step: number, total: number) => void;
  registerPrev: (fn: () => boolean) => void;
  persistKey: string;
  onLoadingChange: (flag: boolean, text?: string) => void;
}

export default function CSectionWrapper({
  loading,
  loadingText,
  onPrev,
  onReset,
  cCats,
  cProgress,
  cProgressMsg,
  cEpoch,
  onSubmit,
  onProgress,
  registerPrev,
  persistKey,
  onLoadingChange,
}: Props) {
  return (
    <div className="w-full sm:w-[640px] lg:w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
        {loading && <LoadingOverlay text={loadingText} />}
        <div className="flex justify-between text-xs text-gray-500 mb-6">
          <button
            onClick={onPrev}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            이전
          </button>
          <button
            onClick={onReset}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            처음부터
          </button>
        </div>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            세부 진단
          </h1>
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>진행도</span>
              {/* <span className="tabular-nums notranslate" translate="no">
                {cProgress.pct}%
              </span> */}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                style={{ width: `${cProgress.pct}%` }}
              />
            </div>
            {/* <div className="mt-1 text-[10px] text-gray-500">
              <span className="notranslate" translate="no">
                {cProgress.step}/{cProgress.total}
              </span>
              문항 완료 ·{" "}
              <span className="notranslate" translate="no">
                {Math.max(cProgress.total - cProgress.step, 0)}
              </span>
              문항 남음
            </div> */}
            <div className="text-[10px] text-sky-600 mt-1">{cProgressMsg}</div>
          </div>
        </div>
        <CSection
          key={`${cEpoch}:${cCats.join(",")}`}
          cats={cCats}
          onSubmit={onSubmit}
          onProgress={onProgress}
          registerPrev={registerPrev}
          persistKey={persistKey}
          onLoadingChange={onLoadingChange}
        />
      </div>
    </div>
  );
}
