"use client";

import { useMemo } from "react";
import {
  type CSectionOption,
  resolveCOptionGridCols,
} from "./cSection.helpers";

type CSectionOptionGridProps = {
  cat: string;
  qIdx: number;
  options: readonly CSectionOption[];
  disabled: boolean;
  isActive: (value: number) => boolean;
  onSelect: (value: number) => void;
};

export default function CSectionOptionGrid({
  cat,
  qIdx,
  options,
  disabled,
  isActive,
  onSelect,
}: CSectionOptionGridProps) {
  const gridCols = useMemo(() => resolveCOptionGridCols(options), [options]);

  return (
    <div className={["mt-6 grid gap-2 p-1 items-stretch", gridCols].join(" ")}>
      {options.map((option) => {
        const active = isActive(option.value);
        return (
          <button
            key={`${cat}:${qIdx}:${option.value}`}
            type="button"
            onClick={() => onSelect(option.value)}
            aria-pressed={active}
            data-selected={active ? "true" : "false"}
            disabled={disabled}
            aria-disabled={disabled}
            className={[
              "relative flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-colors whitespace-normal text-center min-h-[44px] h-full",
              "[-webkit-tap-highlight-color:transparent] touch-manipulation select-none focus:outline-none focus-visible:outline-none",
              disabled
                ? "border-gray-200 bg-white opacity-60 pointer-events-none"
                : active
                ? "border-transparent bg-sky-50 ring-2 ring-sky-400 ring-offset-1 ring-offset-white focus:ring-0 focus-visible:ring-0"
                : "border-gray-200 bg-white supports-[hover:hover]:hover:bg-sky-50 supports-[hover:hover]:hover:border-sky-200 active:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
            ].join(" ")}
          >
            {active ? (
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-sky-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0z" />
              </svg>
            ) : null}
            <span className="leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
