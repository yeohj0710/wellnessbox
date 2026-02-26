import {
  REPORT_ACCENT_COLORS,
  medicationStatusLabel,
  normalizeRiskLevelLabel,
  resolveMetricStatusTone,
} from "@/lib/b2b/report-design";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  buildSparklinePoints,
  ensureArray,
  firstOrDash,
  formatDelta,
  resolveScore,
  scoreTone,
  scoreWidth,
  toScoreValue,
} from "./helpers";

export const REPORT_GAUGE_RADIUS = 46;
export const REPORT_GAUGE_CIRCUMFERENCE = 2 * Math.PI * REPORT_GAUGE_RADIUS;
export const REPORT_SPARKLINE_WIDTH = 360;
export const REPORT_SPARKLINE_HEIGHT = 132;
export const REPORT_SPARKLINE_PAD = 14;

export function buildReportSummaryViewModel(payload: ReportSummaryPayload) {
  const topIssues = ensureArray(payload.analysis?.summary?.topIssues);
  const sectionScores = ensureArray(payload.survey?.sectionScores);
  const recommendations = ensureArray(payload.analysis?.recommendations);
  const trendMonths = ensureArray(payload.analysis?.trend?.months);
  const metrics = ensureArray(payload.health?.coreMetrics);
  const medications = ensureArray(payload.health?.medications);
  const ai = payload.analysis?.aiEvaluation;
  const medStatus = payload.health?.medicationStatus;
  const scoreDetails = payload.analysis?.scoreDetails;
  const riskLevelLabel = normalizeRiskLevelLabel(payload.analysis?.summary?.riskLevel);

  const overallScoreInfo = resolveScore(
    "overall",
    payload.analysis?.summary?.overallScore,
    scoreDetails
  );
  const surveyScoreInfo = resolveScore(
    "survey",
    payload.analysis?.summary?.surveyScore,
    scoreDetails
  );
  const healthScoreInfo = resolveScore(
    "health",
    payload.analysis?.summary?.healthScore,
    scoreDetails
  );
  const medicationScoreInfo = resolveScore(
    "medication",
    payload.analysis?.summary?.medicationScore,
    scoreDetails
  );

  const overallScore = overallScoreInfo.value;
  const surveyScore = surveyScoreInfo.value;
  const healthScore = healthScoreInfo.value;
  const medicationScore = medicationScoreInfo.value;
  const riskTone = scoreTone(overallScore);
  const gaugeOffset =
    overallScore == null
      ? REPORT_GAUGE_CIRCUMFERENCE
      : REPORT_GAUGE_CIRCUMFERENCE * (1 - scoreWidth(overallScore) / 100);

  const summaryCards = [
    {
      key: "overall",
      label: "종합 점수",
      score: overallScore,
      helper:
        overallScoreInfo.status === "missing"
          ? overallScoreInfo.reason
          : `위험도 ${riskLevelLabel}`,
    },
    {
      key: "survey",
      label: "설문 점수",
      score: surveyScore,
      helper:
        surveyScoreInfo.status === "missing"
          ? surveyScoreInfo.reason
          : "설문 응답 기반 산출",
    },
    {
      key: "health",
      label: "검진 점수",
      score: healthScore,
      helper:
        healthScoreInfo.status === "missing"
          ? healthScoreInfo.reason
          : "검진 지표 기반 산출",
    },
    {
      key: "medication",
      label: "복약 점수",
      score: medicationScore,
      helper:
        medicationScoreInfo.status === "missing"
          ? medicationScoreInfo.reason
          : `상태: ${medicationStatusLabel(medStatus?.type)}`,
    },
  ] as const;

  const scoreChartItems = [
    {
      key: "overall",
      label: "종합",
      score: overallScore,
      color: REPORT_ACCENT_COLORS.primary,
    },
    {
      key: "survey",
      label: "설문",
      score: surveyScore,
      color: REPORT_ACCENT_COLORS.warning,
    },
    {
      key: "health",
      label: "검진",
      score: healthScore,
      color: REPORT_ACCENT_COLORS.secondary,
    },
    {
      key: "medication",
      label: "복약",
      score: medicationScore,
      color: REPORT_ACCENT_COLORS.neutral,
    },
  ] as const;

  const trendRows = trendMonths.slice(-6).map((row) => ({
    periodKey: firstOrDash(row.periodKey),
    overallScore: toScoreValue(row.overallScore),
    surveyScore: toScoreValue(row.surveyScore),
    healthScore: toScoreValue(row.healthScore),
  }));

  const sparklineScores = trendRows.map((row) => row.overallScore ?? 0);
  const sparklinePoints = buildSparklinePoints(sparklineScores, {
    width: REPORT_SPARKLINE_WIDTH,
    height: REPORT_SPARKLINE_HEIGHT,
    pad: REPORT_SPARKLINE_PAD,
  });
  const previousOverallScore =
    trendRows.length >= 2 ? trendRows[trendRows.length - 2].overallScore : null;
  const overallDeltaText = formatDelta(overallScore, previousOverallScore);

  const distributionCounts = metrics.reduce(
    (acc, metric) => {
      const tone = resolveMetricStatusTone(metric.status);
      acc[tone] += 1;
      return acc;
    },
    {
      ok: 0,
      warning: 0,
      danger: 0,
      muted: 0,
    }
  );

  const distributionItems = [
    { key: "ok", tone: "ok", count: distributionCounts.ok },
    { key: "warning", tone: "warning", count: distributionCounts.warning },
    { key: "danger", tone: "danger", count: distributionCounts.danger },
    { key: "muted", tone: "muted", count: distributionCounts.muted },
  ] as const;
  const distributionTotal = distributionItems.reduce((sum, item) => sum + item.count, 0);

  const surveyAnsweredCount = sectionScores.reduce(
    (sum, row) => sum + (row.answeredCount ?? 0),
    0
  );
  const surveyQuestionCount = sectionScores.reduce(
    (sum, row) => sum + (row.questionCount ?? 0),
    0
  );
  const surveyResponseCount =
    ensureArray(payload.survey?.answers).length || surveyAnsweredCount;
  const surveyCompletionRate =
    surveyQuestionCount > 0
      ? Math.round((surveyAnsweredCount / surveyQuestionCount) * 100)
      : 0;

  const sectionScoreChart = [...sectionScores]
    .map((row) => ({
      title: firstOrDash(row.sectionTitle),
      score: toScoreValue(row.score) ?? 0,
      answeredCount: row.answeredCount ?? 0,
      questionCount: row.questionCount ?? 0,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const guideItems = ensureArray(ai?.actionItems)
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, 5);
  const fallbackGuideItems = recommendations
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, 5);
  const practiceItems = guideItems.length > 0 ? guideItems : fallbackGuideItems;

  const scoreMissingReasons = [overallScoreInfo, surveyScoreInfo, healthScoreInfo, medicationScoreInfo]
    .filter((item) => item.status === "missing")
    .map((item) => item.reason)
    .filter((reason, index, arr) => reason && arr.indexOf(reason) === index);

  return {
    ai,
    medStatus,
    metrics,
    medications,
    topIssues,
    summaryCards,
    scoreChartItems,
    trendRows,
    sparklineScores,
    sparklinePoints,
    overallScore,
    overallDeltaText,
    riskTone,
    riskLevelLabel,
    gaugeOffset,
    distributionItems,
    distributionTotal,
    surveyResponseCount,
    surveyAnsweredCount,
    surveyQuestionCount,
    surveyCompletionRate,
    sectionScoreChart,
    practiceItems,
    scoreMissingReasons,
  };
}
