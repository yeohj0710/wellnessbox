import type { ReactNode } from "react";

export type BetaFeatureGateProps = {
  children: ReactNode;
  title?: string;
  helper?: string;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
  contentViewportClassName?: string;
  defaultOpen?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function BetaFeatureGate({
  children,
  title = "Beta 기능",
  helper = "필요할 때만 펼쳐보세요.",
  className,
  summaryClassName,
  contentClassName,
  contentViewportClassName,
  defaultOpen = false,
}: BetaFeatureGateProps) {
  return (
    <details
      open={defaultOpen}
      className={joinClassNames(
        "group w-full max-w-full [&_summary::-webkit-details-marker]:hidden",
        className
      )}
    >
      <summary
        className={joinClassNames(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)] transition hover:border-slate-300 hover:shadow-[0_18px_32px_-24px_rgba(15,23,42,0.3)]",
          summaryClassName
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            Beta
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-slate-700 sm:text-base">
              {title}
            </span>
            <span className="mt-0.5 hidden text-[13px] leading-5 text-slate-500 group-open:block">
              {helper}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-[12px] font-medium text-slate-500">
          <span className="group-open:hidden">열기</span>
          <span className="hidden group-open:inline">접기</span>
        </div>
      </summary>
      <div className={joinClassNames("mt-2.5", contentClassName)}>
        <div className={joinClassNames("min-w-0", contentViewportClassName)}>
          {children}
        </div>
      </div>
    </details>
  );
}
