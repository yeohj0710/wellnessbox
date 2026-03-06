import type { WellnessComputedResult } from "@/lib/wellness/analysis";

const SURVEY_RESULT_DONUT_RADIUS = 44;
const SURVEY_RESULT_DONUT_CIRCUMFERENCE = 2 * Math.PI * SURVEY_RESULT_DONUT_RADIUS;

const SURVEY_LIFESTYLE_RISK_LABEL_BY_ID: Record<string, string> = {
  diet: "식습관 위험도",
  activity: "활동량 위험도",
  immune: "면역관리 위험도",
  sleep: "수면 위험도",
};

const SURVEY_LIFESTYLE_RISK_BASE_LABEL_BY_NAME: Record<string, string> = {
  식습관: "식습관",
  활동량: "활동량",
  면역관리: "면역관리",
  수면: "수면",
};

const SURVEY_DEFAULT_LIFESTYLE_RISK_DOMAINS = [
  { id: "diet", label: "식습관 위험도", percent: 0 },
  { id: "activity", label: "활동량 위험도", percent: 0 },
  { id: "immune", label: "면역관리 위험도", percent: 0 },
  { id: "sleep", label: "수면 위험도", percent: 0 },
] as const;

const SURVEY_RADAR_CENTER_X = 120;
const SURVEY_RADAR_CENTER_Y = 106;
const SURVEY_RADAR_RADIUS = 52;
const SURVEY_RADAR_LEVELS = [0.25, 0.5, 0.75, 1] as const;

function clampResultPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toSurveyLifestyleRiskLabel(input: { id?: string; name?: string }) {
  const normalizedId = (input.id ?? "").trim().toLowerCase();
  if (normalizedId && SURVEY_LIFESTYLE_RISK_LABEL_BY_ID[normalizedId]) {
    return SURVEY_LIFESTYLE_RISK_LABEL_BY_ID[normalizedId];
  }

  const rawName = (input.name ?? input.id ?? "").trim();
  const collapsed = rawName.replace(/\s+/g, "");
  const mapped = SURVEY_LIFESTYLE_RISK_BASE_LABEL_BY_NAME[collapsed] || rawName || "생활습관";
  const withoutSuffix = mapped.endsWith("위험도") ? mapped.slice(0, -3).trim() : mapped;
  return `${withoutSuffix} 위험도`;
}

function toSurveyRadarPointString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function shouldWrapLifestyleRiskLabel(input: { id?: string; label: string }) {
  const normalizedId = (input.id ?? "").trim().toLowerCase();
  const normalizedLabel = input.label.replace(/\s+/g, "");
  return (
    normalizedId.includes("activity") ||
    normalizedId.includes("immune") ||
    normalizedLabel.includes("활동량위험도") ||
    normalizedLabel.includes("면역관리위험도")
  );
}

type SurveyLifestyleRiskDomain = {
  id: string;
  label: string;
  percent: number;
};

type SurveyResultRadarAxis = SurveyLifestyleRiskDomain & {
  outerX: number;
  outerY: number;
  valueX: number;
  valueY: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
  labelLines: string[];
};

type SurveySectionNeedRow = {
  sectionId: string;
  sectionTitle: string;
  percent: number;
};

export type SurveyResultSummaryMetrics = {
  healthScore: number;
  lifestyleOverall: number;
  healthNeedAverage: number;
  donutOffset: number;
  radarCenterX: number;
  radarCenterY: number;
  radarAxes: SurveyResultRadarAxis[];
  radarLevelPolygons: Array<{
    level: number;
    points: string;
  }>;
  radarAreaPoints: string;
  sectionNeedRows: SurveySectionNeedRow[];
};

function buildLifestyleRiskDomains(
  resultSummary: WellnessComputedResult
): SurveyLifestyleRiskDomain[] {
  const lifestyleRiskDomainsRaw = resultSummary.lifestyleRisk.domains
    .map((axis) => ({
      id: axis.id,
      label: toSurveyLifestyleRiskLabel({
        id: axis.id,
        name: axis.name ?? axis.id ?? "",
      }),
      percent: clampResultPercent(Math.round(axis.percent ?? 0)),
    }))
    .filter((axis) => axis.label.length > 0)
    .slice(0, 4);

  if (lifestyleRiskDomainsRaw.length > 0) return lifestyleRiskDomainsRaw;
  return [...SURVEY_DEFAULT_LIFESTYLE_RISK_DOMAINS];
}

function buildRadarAxes(domains: SurveyLifestyleRiskDomain[]) {
  return domains.map((axis, index, axisList) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisList.length;
    const outerX = SURVEY_RADAR_CENTER_X + SURVEY_RADAR_RADIUS * Math.cos(angle);
    const outerY = SURVEY_RADAR_CENTER_Y + SURVEY_RADAR_RADIUS * Math.sin(angle);
    const valueRatio = clampResultPercent(axis.percent) / 100;
    const valueX = SURVEY_RADAR_CENTER_X + SURVEY_RADAR_RADIUS * valueRatio * Math.cos(angle);
    const valueY = SURVEY_RADAR_CENTER_Y + SURVEY_RADAR_RADIUS * valueRatio * Math.sin(angle);
    const labelRadius = SURVEY_RADAR_RADIUS + 22;
    const rawLabelX = SURVEY_RADAR_CENTER_X + labelRadius * Math.cos(angle);
    const rawLabelY = SURVEY_RADAR_CENTER_Y + labelRadius * Math.sin(angle);
    const labelX = Math.max(16, Math.min(224, rawLabelX));
    const labelY = Math.max(20, Math.min(186, rawLabelY));
    const labelAnchor: "start" | "middle" | "end" =
      rawLabelX < SURVEY_RADAR_CENTER_X - 30
        ? "end"
        : rawLabelX > SURVEY_RADAR_CENTER_X + 30
          ? "start"
          : "middle";
    const isWrappedRiskLabel = shouldWrapLifestyleRiskLabel({
      id: axis.id,
      label: axis.label,
    });
    const labelBaseText = isWrappedRiskLabel
      ? axis.label.replace(/\s*위험도/u, "").trim()
      : axis.label;
    const labelLines =
      isWrappedRiskLabel && labelBaseText.length > 0 ? [labelBaseText, "위험도"] : [axis.label];

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
    };
  });
}

function buildSectionNeedRows(resultSummary: WellnessComputedResult): SurveySectionNeedRow[] {
  return [...(resultSummary.healthManagementNeed.sections ?? [])]
    .map((section) => ({
      sectionId: section.sectionId,
      sectionTitle: (section.sectionTitle ?? section.sectionId ?? "").trim(),
      percent: clampResultPercent(Math.round(section.percent ?? 0)),
    }))
    .filter((section) => section.sectionTitle.length > 0)
    .sort((left, right) => right.percent - left.percent)
    .slice(0, 3);
}

export function buildSurveyResultSummaryMetrics(
  resultSummary: WellnessComputedResult
): SurveyResultSummaryMetrics {
  const healthScore = clampResultPercent(Math.round(resultSummary.overallHealthScore));
  const lifestyleOverall = clampResultPercent(
    Math.round(resultSummary.lifestyleRisk.overallPercent)
  );
  const healthNeedAverage = clampResultPercent(
    Math.round(resultSummary.healthManagementNeed.averagePercent)
  );
  const donutOffset = SURVEY_RESULT_DONUT_CIRCUMFERENCE * (1 - healthScore / 100);

  const lifestyleRiskDomains = buildLifestyleRiskDomains(resultSummary);
  const radarAxes = buildRadarAxes(lifestyleRiskDomains);
  const radarLevelPolygons = SURVEY_RADAR_LEVELS.map((level) => ({
    level,
    points: toSurveyRadarPointString(
      radarAxes.map((axis) => ({
        x: SURVEY_RADAR_CENTER_X + (axis.outerX - SURVEY_RADAR_CENTER_X) * level,
        y: SURVEY_RADAR_CENTER_Y + (axis.outerY - SURVEY_RADAR_CENTER_Y) * level,
      }))
    ),
  }));
  const radarAreaPoints = toSurveyRadarPointString(
    radarAxes.map((axis) => ({ x: axis.valueX, y: axis.valueY }))
  );
  const sectionNeedRows = buildSectionNeedRows(resultSummary);

  return {
    healthScore,
    lifestyleOverall,
    healthNeedAverage,
    donutOffset,
    radarCenterX: SURVEY_RADAR_CENTER_X,
    radarCenterY: SURVEY_RADAR_CENTER_Y,
    radarAxes,
    radarLevelPolygons,
    radarAreaPoints,
    sectionNeedRows,
  };
}

export { SURVEY_RESULT_DONUT_CIRCUMFERENCE, SURVEY_RESULT_DONUT_RADIUS };
