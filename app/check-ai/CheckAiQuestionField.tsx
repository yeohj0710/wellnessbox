"use client";

import { memo } from "react";

type CheckAiOption = {
  value: number;
  label: string;
};

type CheckAiQuestionFieldProps = {
  index: number;
  question: string;
  options: readonly CheckAiOption[];
  value: number;
  onChange: (index: number, value: number) => void;
};

function CheckAiQuestionFieldComponent({
  index,
  question,
  options,
  value,
  onChange,
}: CheckAiQuestionFieldProps) {
  return (
    <fieldset
      id={`check-ai-question-${index}`}
      className="group rounded-[24px] border border-slate-200/80 bg-white/96 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(56,121,255,0.08)] sm:p-5"
    >
      <legend className="px-1 text-[15px] font-semibold leading-7 text-slate-900 sm:text-base">
        {question}
      </legend>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {options.map((option) => {
          const active = value === option.value;
          const visualActive = active || (value === 0 && option.value === 3);

          return (
            <label
              key={option.value}
              title={option.label}
              className={[
                "relative flex min-h-[54px] cursor-pointer select-none items-center justify-center rounded-2xl px-3 py-2 text-center ring-1 transition",
                "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-sky-200",
                visualActive
                  ? "bg-sky-50/80 ring-2 ring-sky-400 shadow-[0_10px_24px_rgba(56,121,255,0.12)]"
                  : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name={`q-${index}`}
                value={option.value}
                checked={active}
                onChange={() => onChange(index, option.value)}
                className="sr-only"
              />
              <span className="block break-keep text-[13px] font-semibold leading-5 text-slate-800 sm:text-[15px]">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const CheckAiQuestionField = memo(CheckAiQuestionFieldComponent);
