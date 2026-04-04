"use client";

type SurveyResultActionSectionProps = {
  editSurveyLabel: string;
  restartLabel: string;
  onEditSurvey: () => void;
  onRestart: () => void;
};

export default function SurveyResultActionSection({
  editSurveyLabel,
  restartLabel,
  onEditSurvey,
  onRestart,
}: SurveyResultActionSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-sky-50/55 to-white px-3 py-3 shadow-[0_10px_24px_-22px_rgba(14,116,204,0.65)] sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.01em] text-slate-500">다음 단계</p>
          <p className="mt-0.5 text-xs text-slate-500">
            결과를 확인하고 답안을 다시 조정할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/85 pt-3">
        <button
          type="button"
          onClick={onEditSurvey}
          className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
        >
          {editSurveyLabel}
        </button>
        <button
          type="button"
          onClick={onRestart}
          data-testid="survey-result-reset-button"
          className="rounded-full border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-sky-700 hover:decoration-sky-300 active:scale-[0.99]"
        >
          {restartLabel}
        </button>
      </div>
    </section>
  );
}
