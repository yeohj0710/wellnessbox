"use client";

import { useMemo, useState } from "react";
import { Question } from "./questions";

export function NumberInput({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (val: number) => void;
}) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  const { isValid, msg } = useMemo(() => {
    if (val === "") return { isValid: false, msg: "" };
    const num = Number(val);
    if (Number.isNaN(num))
      return { isValid: false, msg: "숫자를 입력해 주세요." };
    if (question.min !== undefined && num < question.min)
      return { isValid: false, msg: `${question.min} 이상 입력해 주세요.` };
    if (question.max !== undefined && num > question.max)
      return { isValid: false, msg: `${question.max} 이하로 입력해 주세요.` };
    return { isValid: true, msg: "" };
  }, [val, question.min, question.max]);

  const submit = () => {
    if (!isValid) return;
    setError("");
    onSubmit(Number(val));
  };

  return (
    <div className="space-y-3">
      <input
        type="number"
        value={val}
        min={question.min}
        max={question.max}
        onChange={(e) => {
          setVal(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        aria-invalid={!isValid && val !== ""}
        className={[
          "w-full rounded-xl border p-3 focus:outline-none focus:ring-2",
          !isValid && val !== ""
            ? "border-red-300 focus:ring-red-400"
            : "border-gray-200 focus:ring-sky-500",
        ].join(" ")}
      />
      {(error || msg) && <p className="text-sm text-red-600">{error || msg}</p>}
      <button
        onClick={submit}
        disabled={!isValid}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow transition-colors hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99] disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        다음
      </button>
    </div>
  );
}

export function MultiSelect({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (vals: any[]) => void;
}) {
  const [selected, setSelected] = useState<any[]>([]);
  const toggle = (v: any) => {
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };
  return (
    <div className="space-y-4">
      <div
        className={[
          "grid gap-2 p-1",
          question.options!.length === 1
            ? "grid-cols-1"
            : question.options!.length === 2
            ? "grid-cols-2 sm:grid-cols-2"
            : question.options!.length === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : question.options!.length === 4
            ? "grid-cols-2 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3",
        ].join(" ")}
      >
        {question.options!.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              data-selected={active ? "true" : "false"}
              className={[
                "relative flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-all whitespace-nowrap focus:outline-none",
                active
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-400 ring-offset-1"
                  : "border-gray-200 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-sky-500",
              ].join(" ")}
            >
              {active && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0z" />
                </svg>
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSubmit(selected)}
        disabled={selected.length === 0}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white shadow transition-colors hover:from-sky-600 hover:to-indigo-600 active:scale-[0.99] disabled:bg-none disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        다음
      </button>
    </div>
  );
}
