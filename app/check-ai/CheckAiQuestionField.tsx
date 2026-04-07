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

const OPTION_STYLES: Record<
  number,
  {
    chip: string;
    idle: string;
    active: string;
    activeChip: string;
  }
> = {
  1: {
    chip: "bg-slate-100 text-slate-600",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    active:
      "border-slate-800 bg-slate-800 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]",
    activeChip: "bg-white/15 text-white",
  },
  2: {
    chip: "bg-slate-100 text-slate-600",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    active:
      "border-slate-700 bg-slate-700 text-white shadow-[0_16px_32px_rgba(51,65,85,0.18)]",
    activeChip: "bg-white/15 text-white",
  },
  3: {
    chip: "bg-sky-50 text-sky-700",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-sky-200",
    active:
      "border-sky-500 bg-sky-500 text-white shadow-[0_16px_32px_rgba(14,165,233,0.2)]",
    activeChip: "bg-white/15 text-white",
  },
  4: {
    chip: "bg-sky-50 text-sky-700",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-sky-300",
    active:
      "border-sky-600 bg-sky-600 text-white shadow-[0_16px_32px_rgba(2,132,199,0.22)]",
    activeChip: "bg-white/15 text-white",
  },
  5: {
    chip: "bg-indigo-50 text-indigo-700",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-indigo-300",
    active:
      "border-indigo-600 bg-indigo-600 text-white shadow-[0_16px_32px_rgba(79,70,229,0.24)]",
    activeChip: "bg-white/15 text-white",
  },
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
      className="group rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(56,121,255,0.08)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500">
            Q{String(index + 1).padStart(2, "0")}
          </span>
          <legend className="mt-3 px-1 text-[17px] font-semibold leading-7 text-slate-900 sm:text-[19px]">
            {question}
          </legend>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            value > 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {value > 0 ? "응답 완료" : "선택해 주세요"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
        <span>전혀 아니에요</span>
        <span>많이 그래요</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {options.map((option) => {
          const active = value === option.value;
          const style = OPTION_STYLES[option.value];

          return (
            <label
              key={option.value}
              title={option.label}
              className={[
                "relative flex min-h-[78px] cursor-pointer select-none items-center rounded-[22px] border px-4 py-3 text-left transition sm:min-h-[112px] sm:justify-center sm:px-3 sm:text-center",
                active ? style.active : style.idle,
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
              <span className="flex w-full items-center gap-3 sm:flex-col sm:justify-center sm:gap-2">
                <span
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                    active ? style.activeChip : style.chip,
                  ].join(" ")}
                >
                  {option.value}
                </span>
                <span className="block break-keep text-[14px] font-semibold leading-5 sm:text-[14px] sm:leading-5 sm:whitespace-nowrap">
                  {option.label}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const CheckAiQuestionField = memo(CheckAiQuestionFieldComponent);
