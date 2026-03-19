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
      className="group rounded-2xl border border-gray-100 p-3 transition hover:border-sky-200 sm:p-5"
    >
      <legend className="px-1 text-[15px] font-semibold text-gray-900 sm:text-base">
        {question}
      </legend>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const active = value === option.value;
          const visualActive = active || (value === 0 && option.value === 3);

          return (
            <label
              key={option.value}
              title={option.label}
              className={[
                "relative cursor-pointer select-none rounded-xl px-3 py-0.5 text-center ring-1 transition sm:py-1",
                "bg-white ring-gray-200 hover:bg-gray-50",
                visualActive ? "bg-sky-50/60 ring-2 ring-sky-400" : "",
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
              <span className="block h-10 overflow-hidden text-ellipsis whitespace-nowrap break-keep text-sm leading-10 text-gray-800 sm:text-[15px]">
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
