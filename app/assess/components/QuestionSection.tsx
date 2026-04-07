"use client";

import { pageShellClass } from "@/lib/page-shell";
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
  const numberInitialValue =
    typeof currentAnswerValue === "number" ? currentAnswerValue : undefined;
  const multiInitialValue = Array.isArray(currentMultiAnswerValue)
    ? currentMultiAnswerValue
    : undefined;

  return (
    <div className={pageShellClass("pb-28")}>
      <div className="relative mt-6 overflow-hidden rounded-3xl bg-white/70 p-6 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur sm:mt-10 sm:p-10">
        {loading ? <LoadingOverlay text={loadingText} /> : null}

        <div className="mb-6 flex justify-between text-sm text-gray-500">
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
          <div className="min-w-0 sm:flex-none">
            <p className="text-sm font-semibold tracking-[0.14em] text-sky-600">
              AI ASSESSMENT
            </p>
            <h1 className="mt-2 break-keep text-2xl font-extrabold text-gray-900 sm:text-3xl sm:whitespace-nowrap">
              {sectionTitle}
            </h1>
          </div>

          <div className="w-full sm:min-w-0 sm:flex-1">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>진행도</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="mt-1 text-[12px] font-medium text-sky-600">{progressMsg}</div>
          </div>
        </div>

        {currentQuestion ? (
          <h2 className="mt-6 text-xl font-bold text-gray-900">
            {currentQuestion.text}
          </h2>
        ) : null}

        {currentQuestion?.type === "choice" ? (
          <div
            className={[
              "mt-6 grid gap-2 p-1 items-stretch",
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
                    "relative flex min-h-[44px] h-full items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm whitespace-normal transition duration-200 ease-out",
                    "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none focus:outline-none focus-visible:outline-none",
                    active
                      ? "border-transparent bg-sky-50 shadow-[0_10px_24px_rgba(14,165,233,0.14)] ring-2 ring-sky-400 ring-offset-1 ring-offset-white"
                      : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-sky-50 supports-[hover:hover]:hover:border-sky-200 active:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                  ].join(" ")}
                >
                  <span className="leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {currentQuestion?.type === "number" ? (
          <div className="mt-6">
            <NumberInput
              key={currentQuestion.id}
              question={currentQuestion}
              onSubmit={(value) => handleAnswer(value)}
              initial={numberInitialValue}
            />
          </div>
        ) : null}

        {currentQuestion?.type === "multi" ? (
          <div className="mt-6">
            <MultiSelect
              key={currentQuestion.id}
              question={currentQuestion}
              onSubmit={(values) => handleAnswer(values)}
              initial={multiInitialValue}
            />
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 flex-1 break-keep text-sm leading-6 text-gray-400 sm:leading-none">
            중간에 나가도 여기까지 답한 내용은 저장돼요.
          </p>
          {currentQuestion ? (
            <button
              onClick={() => handleAnswer(undefined)}
              type="button"
              className="shrink-0 text-sm leading-none text-gray-500 underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            >
              이 질문은 건너뛸래요
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
