import type { CompletionStats } from "./client-types";

export function resolveRecommendedSectionSelectionText(
  range: [number, number] | undefined
) {
  if (!range || range.length !== 2) return "4~5개";
  return `${range[0]}~${range[1]}개`;
}

export function computeSurveyEditorEffectiveProgressPercent(
  stats: CompletionStats,
  surveySubmittedAt: string | null
) {
  if (stats.total <= 0) return 0;
  const hasRequiredCompletion =
    stats.requiredTotal === 0 || stats.requiredAnswered >= stats.requiredTotal;
  if (surveySubmittedAt && hasRequiredCompletion) return 100;
  return stats.percent;
}

export function computeSurveyEditorProgressDoneCount(
  stats: CompletionStats,
  effectiveProgressPercent: number
) {
  if (stats.total <= 0) return 0;
  if (effectiveProgressPercent >= 100) return stats.total;
  return stats.answered;
}
