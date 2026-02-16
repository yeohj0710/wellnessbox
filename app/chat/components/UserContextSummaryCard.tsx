"use client";

import type { UserContextSummary } from "@/lib/chat/context";

type UserContextSummaryCardProps = {
  summary: UserContextSummary;
};

export default function UserContextSummaryCard({
  summary,
}: UserContextSummaryCardProps) {
  const badges =
    summary.evidenceLabels.length > 0
      ? summary.evidenceLabels
      : ["데이터 수집 필요"];

  return (
    <details className="group rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-700">
        <span>내 데이터 요약</span>
        <span className="text-xs text-slate-400 group-open:hidden">펼침</span>
        <span className="text-xs text-slate-400 hidden group-open:inline">접기</span>
      </summary>

      <div className="mt-2 space-y-2 text-xs text-slate-600">
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <ul className="space-y-1.5">
            {summary.contextCardLines.map((line, index) => (
              <li key={`${line}-${index}`} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
