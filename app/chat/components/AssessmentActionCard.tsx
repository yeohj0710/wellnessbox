"use client";

type InChatAssessmentMode = "quick" | "deep";

type InChatAssessmentPrompt = {
  mode: InChatAssessmentMode;
  title: string;
  progressText: string;
  questionText: string;
  expectsNumber: boolean;
  options: string[];
  min?: number;
  max?: number;
};

export default function AssessmentActionCard(props: {
  prompt: InChatAssessmentPrompt | null;
  disabled?: boolean;
  onSelectOption: (label: string) => void;
  onCancel: () => void;
  onOpenPage: (mode: InChatAssessmentMode) => void;
}) {
  const prompt = props.prompt;
  if (!prompt) return null;

  return (
    <div className="mx-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-sky-700">{prompt.title}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
          {prompt.progressText}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-5 text-slate-700">{prompt.questionText}</p>

      {prompt.expectsNumber ? (
        <p className="mt-2 text-[11px] text-slate-500">
          숫자로 답변해 주세요
          {typeof prompt.min === "number" && typeof prompt.max === "number"
            ? ` (${prompt.min}~${prompt.max})`
            : ""}
          . 예: 32
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {prompt.options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onSelectOption(option)}
              className="rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              title={option}
            >
              {index + 1}. {option}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.onOpenPage(prompt.mode)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          페이지에서 이어서 진행
        </button>
        <button
          type="button"
          disabled={props.disabled}
          onClick={props.onCancel}
          className="rounded-full border border-slate-200 bg-transparent px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          검사 중단
        </button>
      </div>
    </div>
  );
}
