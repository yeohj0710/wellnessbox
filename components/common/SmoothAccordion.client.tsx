"use client";

import type { ReactNode } from "react";

type SmoothAccordionProps = {
  open: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
  indicator?: ReactNode;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  panelInnerClassName?: string;
  contentClassName?: string;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function SmoothAccordion({
  open,
  onToggle,
  summary,
  children,
  indicator,
  className,
  buttonClassName,
  panelClassName,
  panelInnerClassName,
  contentClassName,
}: SmoothAccordionProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={joinClassNames(
          "flex w-full items-start justify-between gap-4 text-left",
          buttonClassName
        )}
      >
        <div className={joinClassNames("min-w-0 flex-1", contentClassName)}>
          {summary}
        </div>
        {indicator ? <div className="shrink-0">{indicator}</div> : null}
      </button>

      <div
        className={joinClassNames(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          panelClassName
        )}
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={panelInnerClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
