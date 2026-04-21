"use client";

import {
  resolveGroupFieldValues,
  toInputValue,
  toMultiOtherTextByValue,
  toMultiValues,
  toggleSurveyMultiValue,
  updateSurveyMultiOtherText,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import {
  buildOutOfRangeWarning,
  isNoneLikeOption,
  resolveNumberRangeForGroupField,
  resolveNumberRangeForQuestion,
  resolveOptionLayout,
} from "@/app/survey/_lib/survey-page-helpers";

type SurveyQuestionInputProps = {
  question: WellnessSurveyQuestionForTemplate;
  answers: PublicSurveyAnswers;
  maxSelectedSections: number;
  applyAnswer: (question: WellnessSurveyQuestionForTemplate, rawValue: unknown) => void;
  onAdvance: (params?: { fromQuestionKey?: string; answerOverride?: unknown }) => void;
};

function releaseTouchFocus(target: HTMLElement) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  ) {
    target.blur();
  }
}

export default function SurveyQuestionInput(props: SurveyQuestionInputProps) {
  const { question, answers, maxSelectedSections, applyAnswer, onAdvance } = props;

  if (question.type === "single") {
    const value = toInputValue(answers[question.key]).trim();
    const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
    const optionLayout = resolveOptionLayout(options);

    return (
      <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={`${question.key}-${option.value}`}
              data-testid="survey-option"
              type="button"
              onClick={(event) => {
                releaseTouchFocus(event.currentTarget);
                const nextValue = active ? "" : option.value;
                applyAnswer(question, nextValue);
                if (!nextValue) return;
                onAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
              }}
              className={`rounded-xl border transition ${
                optionLayout.compact
                  ? optionLayout.denseText
                    ? "flex min-h-[44px] items-center justify-center px-2 py-2 text-center text-[11px] font-semibold leading-[1.25] sm:min-h-[48px] sm:px-3 sm:py-2 sm:text-[12px]"
                    : "flex min-h-[44px] items-center justify-center px-2 py-2 text-center text-[12px] font-semibold leading-[1.3] sm:min-h-[48px] sm:px-3 sm:py-2 sm:text-[13px]"
                  : optionLayout.denseText
                    ? "flex min-h-[48px] items-center px-3 py-2 text-left text-[11px] font-medium leading-[1.25] sm:min-h-[52px] sm:px-4 sm:py-2.5 sm:text-[12px]"
                    : "flex min-h-[48px] items-center px-3 py-2 text-left text-[12px] font-medium leading-[1.3] sm:min-h-[52px] sm:px-4 sm:py-2.5 sm:text-[13px]"
              } ${
                active
                  ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                  : "border-slate-300 bg-white text-slate-800 focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200 md:hover:border-sky-300 md:hover:bg-sky-50"
              }`}
            >
              <span className="block w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "multi") {
    const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
    const selected = new Set(toMultiValues(answers[question.key]));
    const otherTextByValue = toMultiOtherTextByValue(answers[question.key]);
    const customOptions = options.filter(
      (option) => option.allowsCustomInput && selected.has(option.value)
    );
    const optionLayout = resolveOptionLayout(options);

    return (
      <div className="space-y-3">
        <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
          {options.map((option) => {
            const active = selected.has(option.value);

            return (
              <button
                key={`${question.key}-${option.value}`}
                data-testid="survey-multi-option"
                type="button"
                onClick={(event) => {
                  releaseTouchFocus(event.currentTarget);
                  applyAnswer(
                    question,
                    toggleSurveyMultiValue(
                      question,
                      answers[question.key],
                      option.value,
                      maxSelectedSections
                    )
                  );
                }}
                className={`rounded-xl border transition ${
                  optionLayout.compact
                    ? optionLayout.denseText
                      ? "flex min-h-[44px] items-center justify-center px-2 py-2 text-center text-[11px] font-semibold leading-[1.25] sm:min-h-[48px] sm:px-3 sm:py-2 sm:text-[12px]"
                      : "flex min-h-[44px] items-center justify-center px-2 py-2 text-center text-[12px] font-semibold leading-[1.3] sm:min-h-[48px] sm:px-3 sm:py-2 sm:text-[13px]"
                    : optionLayout.denseText
                      ? "flex min-h-[48px] items-center px-3 py-2 text-left text-[11px] font-medium leading-[1.25] sm:min-h-[52px] sm:px-4 sm:py-2.5 sm:text-[12px]"
                      : "flex min-h-[48px] items-center px-3 py-2 text-left text-[12px] font-medium leading-[1.3] sm:min-h-[52px] sm:px-4 sm:py-2.5 sm:text-[13px]"
                } ${
                  active
                    ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                    : "border-slate-300 bg-white text-slate-800 focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200 md:hover:border-sky-300 md:hover:bg-sky-50"
                }`}
              >
                <span className="block w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {customOptions.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {customOptions.map((option) => (
              <input
                key={`${question.key}-${option.value}-other`}
                data-testid="survey-multi-other-input"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                value={otherTextByValue[option.value] ?? ""}
                onChange={(event) =>
                  applyAnswer(
                    question,
                    updateSurveyMultiOtherText(
                      question,
                      answers[question.key],
                      option.value,
                      event.target.value,
                      maxSelectedSections
                    )
                  )
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  onAdvance();
                }}
                placeholder={option.label}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (question.type === "group") {
    const fields = question.fields ?? [];
    const fieldValues = resolveGroupFieldValues(question, answers[question.key]);

    return (
      <div className={`grid gap-3 ${fields.length >= 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {fields.map((field, index) => {
          const isNumericField = field.type === "number";
          const inputId = `${question.key}-${field.id}`;
          const value = fieldValues[field.id] ?? "";
          const numericRule = isNumericField ? resolveNumberRangeForGroupField(field) : null;
          const numericWarning = numericRule ? buildOutOfRangeWarning(numericRule, value) : null;

          return (
            <label key={inputId} className="space-y-1.5 text-sm text-slate-700">
              <span className="font-semibold">
                {field.label}
                {field.unit ? ` (${field.unit})` : ""}
              </span>
              <input
                id={inputId}
                type="text"
                data-testid={`survey-group-input-${field.id}`}
                value={value}
                inputMode={isNumericField ? "decimal" : "text"}
                pattern={isNumericField ? "[0-9]*" : undefined}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                onChange={(event) => {
                  const rawValue = event.target.value;
                  const nextValue = isNumericField ? rawValue.replace(/[^0-9.]/g, "") : rawValue;
                  applyAnswer(question, {
                    fieldValues: {
                      ...fieldValues,
                      [field.id]: nextValue,
                    },
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const nextField = fields[index + 1];
                  if (nextField) {
                    const nextNode = document.getElementById(
                      `${question.key}-${nextField.id}`
                    ) as HTMLInputElement | null;
                    nextNode?.focus();
                    return;
                  }
                  onAdvance();
                }}
                placeholder={field.unit ? `${field.unit}` : undefined}
              />
              {numericWarning ? (
                <p className="text-xs font-medium text-amber-700">{numericWarning}</p>
              ) : null}
            </label>
          );
        })}
      </div>
    );
  }

  const inputValue = toInputValue(answers[question.key]);
  const isNumberQuestion = question.type === "number";
  const numberRule = isNumberQuestion ? resolveNumberRangeForQuestion(question) : null;
  const numericWarning = numberRule ? buildOutOfRangeWarning(numberRule, inputValue) : null;

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        data-testid={isNumberQuestion ? "survey-number-input" : "survey-text-input"}
        value={inputValue}
        inputMode={isNumberQuestion ? "decimal" : "text"}
        pattern={isNumberQuestion ? "[0-9]*" : undefined}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-base"
        placeholder={
          question.placeholder ?? (isNumberQuestion ? "숫자를 입력해 주세요" : "답변을 입력해 주세요")
        }
        onChange={(event) => {
          const rawValue = event.target.value;
          const nextValue = isNumberQuestion ? rawValue.replace(/[^0-9.]/g, "") : rawValue;
          applyAnswer(question, nextValue);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const nextValue = isNumberQuestion
            ? event.currentTarget.value.replace(/[^0-9.]/g, "")
            : event.currentTarget.value;
          onAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
        }}
      />
      {numericWarning ? <p className="text-xs font-medium text-amber-700">{numericWarning}</p> : null}
    </div>
  );
}
