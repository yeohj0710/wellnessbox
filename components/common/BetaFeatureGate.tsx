import type { ReactNode } from "react";

type BetaFeatureGateProps = {
  children: ReactNode;
  title?: string;
  helper?: string;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
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
  defaultOpen = false,
}: BetaFeatureGateProps) {
  return (
    <details
      open={defaultOpen}
      className={joinClassNames(
        "group mx-auto w-full max-w-[640px] rounded-2xl border border-slate-200/80 bg-white/80 p-2.5 shadow-sm [&_summary::-webkit-details-marker]:hidden",
        className
      )}
    >
      <summary
        className={joinClassNames(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-0.5",
          summaryClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
            Beta
          </span>
          <span className="truncate text-xs font-medium text-slate-700">{title}</span>
          <span className="hidden text-[11px] text-slate-400 group-open:inline">
            {helper}
          </span>
        </div>
        <div className="shrink-0 text-[11px] font-medium text-slate-400">
          <span className="group-open:hidden">열기</span>
          <span className="hidden group-open:inline">접기</span>
        </div>
      </summary>
      <div className={joinClassNames("mt-2.5", contentClassName)}>{children}</div>
    </details>
  );
}
