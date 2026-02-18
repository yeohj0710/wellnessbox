"use client";

import { Question } from "../data/questions";
import { NumberInput, MultiSelect } from "./inputs";
import LoadingOverlay from "./LoadingOverlay";

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
  answers: Record<string, any>;
  current: string;
  handleAnswer: (val: any) => void;
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
  answers,
  current,
  handleAnswer,
}: Props) {
  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-hidden sm:rounded-3xl sm:bg-white/70 sm:ring-1 sm:ring-black/5 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:backdrop-blur">
        {loading && <LoadingOverlay text={loadingText} />}
        <div className="relative p-4 sm:p-10">
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            <button
              onClick={onBack}
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
              {sectionTitle}
            </h1>
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>진행도</span>
                {/* <span className="tabular-nums">{completion}%</span> */}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              {/* <div className="mt-1 text-[10px] text-gray-500">
                {answered}/{total}문항 완료 · {total - answered}문항 남음
              </div> */}
              <div className="text-[10px] text-sky-600 mt-1">
                {progressMsg}
              </div>
            </div>
          </div>

          {currentQuestion && (
            <h2 className="mt-6 text-xl font-bold text-gray-900">
              {currentQuestion.text}
            </h2>
          )}

          {currentQuestion?.type === "choice" && (
            <div
              className={[
                "mt-6 grid gap-2",
                currentQuestion.options!.length === 1
                  ? "grid-cols-1"
                  : currentQuestion.options!.length === 2
                  ? "grid-cols-2 sm:grid-cols-2"
                  : currentQuestion.options!.length === 3
                  ? "grid-cols-2 sm:grid-cols-3"
                  : currentQuestion.options!.length === 4
                  ? "grid-cols-2 sm:grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3",
              ].join(" ")}
            >
              {currentQuestion.options!.map((opt) => {
                const active = answers[current] === opt.value;
                return (
                  <button
                    key={`${currentQuestion.id}:${String(opt.value)}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleAnswer(opt.value);
                    }}
                    className={[
                      "rounded-xl border p-3 text-sm transition-colors flex items-center justify-center text-center whitespace-normal leading-tight min-h-[44px]",
                      "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none active:bg-white focus:outline-none focus-visible:outline-none",
                      active
                        ? "border-transparent bg-sky-50 ring-2 ring-sky-400 ring-offset-1 ring-offset-white focus:ring-0 focus-visible:ring-0"
                        : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-sky-50 supports-[hover:hover]:hover:border-sky-200 active:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion?.type === "number" && (
            <div className="mt-4">
              <NumberInput
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(v) => handleAnswer(v)}
                initial={answers[currentQuestion.id]}
              />
            </div>
          )}

          {currentQuestion?.type === "multi" && (
            <div className="mt-4">
              <MultiSelect
                key={currentQuestion.id}
                question={currentQuestion}
                onSubmit={(vals) => handleAnswer(vals)}
                initial={answers[currentQuestion.id]}
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-2">
            <p className="flex-1 min-w-0 truncate text-xs leading-none text-gray-400">
              중간에 나갔다 와도 진행 상황이 저장돼요.
            </p>
            {currentQuestion && (
              <button
                onClick={() => handleAnswer(undefined)}
                type="button"
                className="shrink-0 text-xs leading-none text-gray-500 underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
              >
                이 질문은 건너뛸래요
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
