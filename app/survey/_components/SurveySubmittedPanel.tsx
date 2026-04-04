"use client";

export type SurveySubmittedPanelText = {
  submittedTitle: string;
  submittedDesc: string;
  editSurvey: string;
  restart: string;
};

export default function SurveySubmittedPanel(props: {
  text: SurveySubmittedPanelText;
  onEditSurvey: () => void;
  onRestart: () => void;
}) {
  const { text } = props;

  return (
    <div
      data-testid="survey-submitted-panel"
      className="mx-auto max-w-[860px] rounded-[30px] border border-sky-200/70 bg-white/92 p-6 shadow-[0_26px_58px_-34px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8"
    >
      <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
        설문 제출 완료
      </span>
      <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">{text.submittedTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{text.submittedDesc}</p>

      <section className="mt-7 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-sky-50/55 to-white px-3 py-3 shadow-[0_10px_24px_-22px_rgba(14,116,204,0.65)] sm:px-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.01em] text-slate-500">다음 단계</p>
          <p className="mt-0.5 text-xs text-slate-500">설문 답안을 수정하거나 처음부터 다시 진행할 수 있습니다.</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/85 pt-3">
          <button
            type="button"
            onClick={props.onEditSurvey}
            className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
          >
            {text.editSurvey}
          </button>
          <button
            type="button"
            onClick={props.onRestart}
            data-testid="survey-submitted-reset-button"
            className="rounded-full border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-sky-700 hover:decoration-sky-300 active:scale-[0.99]"
          >
            {text.restart}
          </button>
        </div>
      </section>
    </div>
  );
}
