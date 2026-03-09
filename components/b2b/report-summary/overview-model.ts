import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  clampPercent,
  resolveHealthScoreLabel,
  sanitizeTitle,
  toTrimmedText,
} from "./card-insights";
import { ensureArray, firstOrDash, toScoreLabel, toScoreValue } from "./helpers";

export const REPORT_SUMMARY_DONUT_RADIUS = 52;
export const REPORT_SUMMARY_DONUT_CIRCUMFERENCE =
  2 * Math.PI * REPORT_SUMMARY_DONUT_RADIUS;
export const REPORT_SUMMARY_MAX_PAGE1_SECTION_BARS = 3;
export const REPORT_SUMMARY_RADAR_CENTER_X = 120;
export const REPORT_SUMMARY_RADAR_CENTER_Y = 106;
export const REPORT_SUMMARY_RADAR_RADIUS = 52;
export const REPORT_SUMMARY_RADAR_LEVELS = [0.25, 0.5, 0.75, 1] as const;

const LIFESTYLE_RISK_LABEL_BY_ID: Record<string, string> = {
  diet: "식습관 위험도",
  activity: "신체활동 위험도",
  immune: "면역관리 위험도",
  sleep: "수면 위험도",
};

const LIFESTYLE_RISK_BASE_LABEL_BY_NAME: Record<string, string> = {
  식습관: "식습관",
  신체활동: "신체활동",
  면역관리: "면역관리",
  수면: "수면",
};

export type ReportSummaryOverviewRadarAxis = {
  id: string;
  label: string;
  score: number;
  outerX: number;
  outerY: number;
  valueX: number;
  valueY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  labelLines: string[];
  scoreText: string;
};

export type ReportSummaryOverviewSectionNeed = {
  sectionId: string;
  sectionTitle: string;
  percent: number;
  percentText: string;
};

export type ReportSummaryOverviewModel = {
  donutOffset: number;
  resolvedHealthScore: { valueText: string; unitText?: string };
  lifestyleOverallText: string;
  healthNeedAverageText: string;
  radarAxes: ReportSummaryOverviewRadarAxis[];
  radarAreaPoints: string;
  sectionNeedsForPage1: ReportSummaryOverviewSectionNeed[];
  hiddenSectionNeedCount: number;
  sectionTitleById: Map<string, string>;
};

function toLifestyleRiskLabel(input: { id?: string; label?: string }) {
  const normalizedId = toTrimmedText(input.id).toLowerCase();
  if (normalizedId && LIFESTYLE_RISK_LABEL_BY_ID[normalizedId]) {
    return LIFESTYLE_RISK_LABEL_BY_ID[normalizedId];
  }

  const rawLabel = sanitizeTitle(toTrimmedText(input.label || input.id));
  const collapsed = rawLabel.replace(/\s+/g, "");
  const mapped = LIFESTYLE_RISK_BASE_LABEL_BY_NAME[collapsed] || rawLabel || "생활습관";
  const withoutSuffix = mapped.endsWith("위험도")
    ? mapped.slice(0, -3).trim()
    : mapped;
  return `${withoutSuffix} 위험도`;
}

function shouldWrapLifestyleRiskLabel(input: { id: string; label: string }) {
  const normalizedId = input.id.trim().toLowerCase();
  const normalizedLabel = input.label.replace(/\s+/g, "");
  return (
    normalizedId.includes("activity") ||
    normalizedId.includes("immune") ||
    normalizedLabel.includes("신체활동위험도") ||
    normalizedLabel.includes("면역관리위험도")
  );
}

function toRadarPointString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function buildReportSummaryOverviewModel(
  payload: ReportSummaryPayload
): ReportSummaryOverviewModel {
  const wellness = payload.analysis?.wellness;
  const commonQuestionScores = wellness?.perQuestionScores?.common ?? {};
  const sectionScoreMaps = wellness?.perQuestionScores?.sections ?? {};

  const lifestyleAnsweredCount = Object.entries(commonQuestionScores).filter(
    ([questionId, score]) =>
      /^C(1[0-9]|2[0-6])$/.test(questionId) &&
      typeof score === "number" &&
      Number.isFinite(score)
  ).length;
  const sectionAnsweredCount = Object.values(sectionScoreMaps).reduce((sum, sectionMap) => {
    return (
      sum +
      Object.values(sectionMap ?? {}).filter(
        (score) => typeof score === "number" && Number.isFinite(score)
      ).length
    );
  }, 0);

  const hasWellnessScoringData = lifestyleAnsweredCount > 0 || sectionAnsweredCount > 0;

  const healthScore = hasWellnessScoringData
    ? toScoreValue(
        wellness?.overallHealthScore ?? payload.analysis?.summary?.overallScore ?? null
      )
    : null;
  const lifestyleOverall = hasWellnessScoringData
    ? toScoreValue(wellness?.lifestyleRisk?.overallPercent ?? null)
    : null;
  const healthNeedAverage = hasWellnessScoringData
    ? toScoreValue(wellness?.healthManagementNeed?.averagePercent ?? null)
    : null;

  const donutOffset =
    healthScore == null
      ? REPORT_SUMMARY_DONUT_CIRCUMFERENCE
      : REPORT_SUMMARY_DONUT_CIRCUMFERENCE * (1 - clampPercent(healthScore) / 100);

  const resolvedHealthScore = resolveHealthScoreLabel(healthScore);

  const lifestyleRiskAxes = ensureArray(wellness?.lifestyleRisk?.domains)
    .map((axis) => ({
      id: firstOrDash(axis?.id),
      label: toLifestyleRiskLabel({
        id: firstOrDash(axis?.id),
        label: firstOrDash(axis?.name || axis?.id),
      }),
      score: clampPercent(axis?.percent),
    }))
    .slice(0, 4);

  const resolvedLifestyleRiskAxes =
    lifestyleRiskAxes.length > 0
      ? lifestyleRiskAxes
      : [
          { id: "diet", label: "식습관 위험도", score: 0 },
          { id: "activity", label: "신체활동 위험도", score: 0 },
          { id: "immune", label: "면역관리 위험도", score: 0 },
          { id: "sleep", label: "수면 위험도", score: 0 },
        ];

  const sectionNeeds = ensureArray(wellness?.healthManagementNeed?.sections)
    .map((section) => ({
      sectionId: firstOrDash(section?.sectionId),
      sectionTitle: sanitizeTitle(firstOrDash(section?.sectionTitle || section?.sectionId)),
      percent: clampPercent(section?.percent),
    }))
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });

  const sectionTitleById = new Map(
    sectionNeeds
      .filter((row) => row.sectionId.length > 0 && row.sectionId !== "-")
      .map((row) => [row.sectionId, row.sectionTitle] as const)
  );

  const sectionNeedsForPage1 = sectionNeeds
    .slice(0, REPORT_SUMMARY_MAX_PAGE1_SECTION_BARS)
    .map((section) => ({
      ...section,
      percentText: toScoreLabel(section.percent),
    }));
  const hiddenSectionNeedCount = Math.max(0, sectionNeeds.length - sectionNeedsForPage1.length);

  const radarAxes: ReportSummaryOverviewRadarAxis[] = resolvedLifestyleRiskAxes.map(
    (axis, index, axisList) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisList.length;
      const outerX =
        REPORT_SUMMARY_RADAR_CENTER_X + REPORT_SUMMARY_RADAR_RADIUS * Math.cos(angle);
      const outerY =
        REPORT_SUMMARY_RADAR_CENTER_Y + REPORT_SUMMARY_RADAR_RADIUS * Math.sin(angle);
      const valueRatio = clampPercent(axis.score) / 100;
      const valueX =
        REPORT_SUMMARY_RADAR_CENTER_X +
        REPORT_SUMMARY_RADAR_RADIUS * valueRatio * Math.cos(angle);
      const valueY =
        REPORT_SUMMARY_RADAR_CENTER_Y +
        REPORT_SUMMARY_RADAR_RADIUS * valueRatio * Math.sin(angle);
      const labelRadius = REPORT_SUMMARY_RADAR_RADIUS + 22;
      const rawLabelX = REPORT_SUMMARY_RADAR_CENTER_X + labelRadius * Math.cos(angle);
      const rawLabelY = REPORT_SUMMARY_RADAR_CENTER_Y + labelRadius * Math.sin(angle);
      const labelX = Math.max(16, Math.min(224, rawLabelX));
      const labelY = Math.max(20, Math.min(186, rawLabelY));
      const labelAnchor: "start" | "middle" | "end" =
        rawLabelX < REPORT_SUMMARY_RADAR_CENTER_X - 30
          ? "end"
          : rawLabelX > REPORT_SUMMARY_RADAR_CENTER_X + 30
            ? "start"
            : "middle";
      const isWrappedRiskLabel = shouldWrapLifestyleRiskLabel({
        id: axis.id,
        label: axis.label,
      });
      const labelBaseText = isWrappedRiskLabel
        ? axis.label.replace(/\s*위험도$/u, "").trim()
        : axis.label;
      const labelLines =
        isWrappedRiskLabel && labelBaseText.length > 0
          ? [labelBaseText, "위험도"]
          : [axis.label];

      return {
        ...axis,
        outerX,
        outerY,
        valueX,
        valueY,
        labelX,
        labelY,
        labelAnchor,
        labelLines,
        scoreText: toScoreLabel(axis.score),
      };
    }
  );

  const radarAreaPoints = toRadarPointString(
    radarAxes.map((axis) => ({ x: axis.valueX, y: axis.valueY }))
  );

  return {
    donutOffset,
    resolvedHealthScore,
    lifestyleOverallText: toScoreLabel(lifestyleOverall),
    healthNeedAverageText: toScoreLabel(healthNeedAverage),
    radarAxes,
    radarAreaPoints,
    sectionNeedsForPage1,
    hiddenSectionNeedCount,
    sectionTitleById,
  };
}
