import type { CompletionStats } from "../_lib/client-types";
import { formatDateTime } from "../_lib/client-utils";

type B2bSurveyEditorProgressHeaderProps = {
  completionStats: CompletionStats;
  displayTotal: number;
  progressDoneCount: number;
  effectiveProgressPercent: number;
  surveyUpdatedAt: string | null;
};

export default function B2bSurveyEditorProgressHeader({
  completionStats,
  displayTotal,
  progressDoneCount,
  effectiveProgressPercent,
  surveyUpdatedAt,
}: B2bSurveyEditorProgressHeaderProps) {
  return (
    <header className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <p className="text-sm font-semibold text-sky-700">임직원 설문 입력</p>
        <p className="mt-1 text-4xl font-extrabold leading-none text-slate-900 sm:text-5xl">
          {progressDoneCount}/{displayTotal}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          마지막 저장: {formatDateTime(surveyUpdatedAt)}
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>진행률</span>
          <span>{effectiveProgressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-sky-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
            style={{ width: `${effectiveProgressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          필수 완료 {completionStats.requiredAnswered}/{completionStats.requiredTotal}
        </p>
      </div>
    </header>
  );
}
