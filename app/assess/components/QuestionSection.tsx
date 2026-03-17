"use client";

import { Question } from "../data/questions";
import LoadingOverlay from "./LoadingOverlay";
import { MultiSelect, NumberInput } from "./inputs";

interface Props {
  loading: boolean;
  loadingText: string;
  onBack: () => void;
  onReset: () => void;
  sectionTitle: string;
  completion: number;
  answered: number;
  total: number;
  progressMsg: string;
  currentQuestion?: Question;
  questionGuide?: { title: string; description: string } | null;
  answers: Record<string, unknown>;
  current: string;
  handleAnswer: (val: unknown) => void;
}

function renderChoiceGridColumnClass(optionCount: number) {
  if (optionCount <= 1) return "grid-cols-1";
  if (optionCount === 2) return "grid-cols-2";
  if (optionCount === 3) return "grid-cols-2 sm:grid-cols-3";
  if (optionCount === 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

export default function QuestionSection({
  loading,
  loadingText,
  onBack,
  onReset,
  sectionTitle,
  completion,
  answered,
  total,
  progressMsg,
  currentQuestion,
  questionGuide,
  answers,
  current,
  handleAnswer,
}: Props) {
  const currentAnswerValue =
    currentQuestion?.type === "number" ? answers[currentQuestion.id] : undefined;
  const currentMultiAnswerValue =
    currentQuestion?.type === "multi" ? answers[currentQuestion.id] : undefined;
  const numberInitialValue: number | undefined =
    typeof currentAnswerValue === "number"
      ? currentAnswerValue
      : undefined;
  const multiInitialValue: any[] | undefined =
    Array.isArray(currentMultiAnswerValue)
      ? currentMultiAnswerValue
      : undefined;

  return (
    <div className="mx-auto w-full max-w-[820px] px-3 pb-24 sm:px-4 sm:pb-28">
      <div className="relative mt-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:mt-8 sm:rounded-[34px] sm:ring-1 sm:ring-black/5 sm:backdrop-blur">
        {loading ? <LoadingOverlay text={loadingText} /> : null}

        <div className="relative p-5 sm:p-8 lg:p-10">
          <div className="mb-6 flex items-center justify-between text-sm text-slate-500 sm:mb-8">
            <button
              onClick={onBack}
              className="select-none underline underline-offset-4 transition duration-200 hover:text-slate-700 hover:translate-x-[-1px] [-webkit-tap-highlight-color:transparent] touch-manipulation"
            >
              이전
            </button>
            <button
              onClick={onReset}
              className="select-none underline underline-offset-4 transition duration-200 hover:text-slate-700 hover:translate-x-[1px] [-webkit-tap-highlight-color:transparent] touch-manipulation"
            >
              처음부터
            </button>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,1fr)_200px] md:items-start">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-500 sm:text-base">
                {sectionTitle}
              </p>
              {currentQuestion ? (
                <h1 className="mt-3 max-w-[14ch] text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:max-w-none sm:text-4xl sm:leading-tight">
                  {currentQuestion.text}
                </h1>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>진행도</span>
                <span className="tabular-nums text-slate-700">{completion}%</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {answered}/{total} 문항
                </span>
                <span className="font-medium text-sky-700">{progressMsg}</span>
              </div>
            </div>
          </div>

          {currentQuestion?.type === "choice" ? (
            <div
              className={[
                "mt-8 grid gap-3 sm:mt-10",
                renderChoiceGridColumnClass(currentQuestion.options?.length ?? 0),
              ].join(" ")}
            >
              {currentQuestion.options?.map((opt) => {
                const active = answers[current] === opt.value;

                return (
                  <button
                    key={`${currentQuestion.id}:${String(opt.value)}`}
                    onClick={(event) => {
                      event.currentTarget.blur();
                      handleAnswer(opt.value);
                    }}
                    className={[
                      "min-h-[58px] rounded-2xl border px-4 py-3 text-sm font-medium leading-6 transition duration-200 ease-out will-change-transform",
                      "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none focus:outline-none",
                      active
                        ? "border-transparent bg-sky-50 text-sky-900 shadow-[0_12px_28px_rgba(14,165,233,0.14)] ring-2 ring-sky-500 ring-offset-2 ring-offset-white"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-[2px] hover:border-sky-200 hover:bg-sky-50/60 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentQuestion?.type === "number" ? (
            <div className="mt-8 sm:mt-10">
              <NumberInput
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(value) => handleAnswer(value)}
                initial={numberInitialValue}
              />
            </div>
          ) : null}

          {currentQuestion?.type === "multi" ? (
            <div className="mt-8 sm:mt-10">
              <MultiSelect
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(values) => handleAnswer(values)}
                initial={multiInitialValue}
              />
            </div>
          ) : null}

          {questionGuide ? (
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.02em] text-slate-700">
                    {questionGuide.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {questionGuide.description}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm">
            <p className="min-w-0 flex-1 leading-6 text-slate-400">
              중간에 나갔다 와도 진행 상황이 저장돼요.
            </p>
            {currentQuestion ? (
              <button
                onClick={() => handleAnswer(undefined)}
                type="button"
                className="shrink-0 select-none text-slate-500 underline underline-offset-4 transition duration-200 hover:text-slate-700 hover:translate-x-[1px] [-webkit-tap-highlight-color:transparent] touch-manipulation"
              >
                이 질문은 건너뛸래요
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
