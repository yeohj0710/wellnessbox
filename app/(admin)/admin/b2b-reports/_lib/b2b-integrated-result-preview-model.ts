import { resolvePreferredAnswerText } from "@/components/b2b/report-summary/card-insights";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";

type HighlightCategory = WellnessComputedResult["highRiskHighlights"][number]["category"];

const EMPTY_SECTION_TITLE_MAP = new Map<string, string>();
const HIGHLIGHT_CATEGORY_SET = new Set<HighlightCategory>([
  "common",
  "detailed",
  "domain",
  "section",
]);

export const B2B_INTEGRATED_SURVEY_RESULT_TEXT = {
  resultTitle: "설문 결과",
  scoreHealth: "건강점수",
  scoreRisk: "생활습관 위험도",
  editSurvey: "설문 답안 수정",
  restart: "처음부터 다시 시작",
  viewEmployeeReport: "내 건강 레포트 보기",
} as const;

export type B2bIntegratedHealthMetric = {
  label: string;
  value: string;
  status?: string;
};

export type B2bIntegratedMedication = {
  medicationName: string;
  date: string;
  hospitalName: string;
};

export type B2bIntegratedResultPreviewModel = {
  resultSummary: WellnessComputedResult | null;
  sectionTitleMap: Map<string, string>;
  healthMetrics: B2bIntegratedHealthMetric[];
  medicationStatusMessage: string;
  medications: B2bIntegratedMedication[];
  pharmacistSummary: string;
  pharmacistRecommendations: string;
  pharmacistCautions: string;
};

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function resolveHighlightCategory(value: unknown): HighlightCategory {
  const category = toText(value) as HighlightCategory;
  return HIGHLIGHT_CATEGORY_SET.has(category) ? category : "section";
}

function formatMetricValue(value: unknown, unit?: unknown) {
  const valueText = toText(value);
  const unitText = toText(unit);
  if (!valueText && !unitText) return "-";
  if (!unitText) return valueText || "-";
  if (!valueText) return unitText;
  return `${valueText} ${unitText}`;
}

function resolveQuestionKey(input: {
  questionKey?: unknown;
  sectionId?: unknown;
  questionNumber?: number;
  category?: HighlightCategory;
}) {
  const directKey = toText(input.questionKey);
  if (directKey) return directKey;

  if (typeof input.questionNumber !== "number" || !Number.isFinite(input.questionNumber)) return "";
  const normalizedNumber = Math.round(input.questionNumber);
  if (normalizedNumber <= 0) return "";

  if (input.category === "common") {
    return `C${String(normalizedNumber).padStart(2, "0")}`;
  }

  const sectionId = toText(input.sectionId);
  if (!sectionId) return "";
  return `${sectionId}_Q${String(normalizedNumber).padStart(2, "0")}`;
}

function buildSurveyAnswerTextByQuestionKey(payload: ReportSummaryPayload | null | undefined) {
  const map = new Map<string, string>();
  for (const answer of ensureArray(payload?.survey?.answers)) {
    const questionKey = toText(answer?.questionKey);
    if (!questionKey) continue;
    const answerText = toText(answer?.answerText) || toText(answer?.answerValue);
    if (!answerText) continue;
    map.set(questionKey, answerText);
  }
  return map;
}

function buildSectionTitleMap(resultSummary: WellnessComputedResult | null) {
  if (!resultSummary) return EMPTY_SECTION_TITLE_MAP;
  return new Map(
    resultSummary.healthManagementNeed.sections.map((section) => [section.sectionId, section.sectionTitle])
  );
}

function buildHealthMetrics(payload: ReportSummaryPayload | null | undefined): B2bIntegratedHealthMetric[] {
  const metrics = ensureArray(payload?.health?.metrics).map((metric) => ({
    label: toText(metric?.metric),
    value: formatMetricValue(metric?.value, metric?.unit),
  }));
  if (metrics.length > 0) return metrics;
  return ensureArray(payload?.health?.coreMetrics).map((metric) => ({
    label: toText(metric?.label),
    value: formatMetricValue(metric?.value, metric?.unit),
    status: toText(metric?.status) || undefined,
  }));
}

function buildMedications(payload: ReportSummaryPayload | null | undefined): B2bIntegratedMedication[] {
  return ensureArray(payload?.health?.medications).map((item) => ({
    medicationName: toText(item?.medicationName),
    date: toText(item?.date),
    hospitalName: toText(item?.hospitalName),
  }));
}

function toWellnessResult(payload: ReportSummaryPayload | null | undefined): WellnessComputedResult | null {
  const wellness = payload?.analysis?.wellness;
  if (!wellness) return null;
  const surveyAnswerTextByQuestionKey = buildSurveyAnswerTextByQuestionKey(payload);

  const domains = ensureArray(wellness.lifestyleRisk?.domains).map((domain, index) => ({
    id: toText(domain?.id) || `domain-${index + 1}`,
    name: toText(domain?.name) || toText(domain?.id) || `영역 ${index + 1}`,
    normalized: toNumber(domain?.normalized),
    percent: clampPercent(toNumber(domain?.percent)),
  }));
  const domainScoresNormalized: Record<string, number> = {};
  const domainScoresPercent: Record<string, number> = {};
  for (const domain of domains) {
    domainScoresNormalized[domain.id] = domain.normalized;
    domainScoresPercent[domain.id] = domain.percent;
  }

  const sectionNeedRows = ensureArray(wellness.healthManagementNeed?.sections).map(
    (section, index) => ({
      sectionId: toText(section?.sectionId) || `section-${index + 1}`,
      sectionTitle:
        toText(section?.sectionTitle) || toText(section?.sectionId) || `선택 영역 ${index + 1}`,
      percent: clampPercent(toNumber(section?.percent)),
    })
  );

  const sectionAdvice: WellnessComputedResult["sectionAdvice"] = {};
  const rawSectionAdvice = wellness.sectionAdvice ?? {};
  for (const [sectionId, sectionValue] of Object.entries(rawSectionAdvice)) {
    const sectionTitle = toText(sectionValue?.sectionTitle) || sectionId;
    const items = ensureArray(sectionValue?.items).map((item, index) => {
      const numeric = toNumber(item?.questionNumber);
      const questionNumber = numeric > 0 ? Math.round(numeric) : index + 1;
      const questionKey = resolveQuestionKey({
        questionKey: item?.questionKey,
        sectionId,
        questionNumber,
      });
      const answerText = resolvePreferredAnswerText({
        questionKey,
        rawAnswerText: item?.answerText,
        surveyAnswerText: questionKey ? surveyAnswerTextByQuestionKey.get(questionKey) : undefined,
        emptyFallback: "",
      });
      return {
        questionNumber,
        score: clampPercent(toNumber(item?.score)),
        text: toText(item?.text),
        questionKey: questionKey || undefined,
        questionText: toText(item?.questionText) || undefined,
        answerText: answerText || null,
      };
    });
    sectionAdvice[sectionId] = { sectionTitle, items };
  }

  const highRiskHighlights: WellnessComputedResult["highRiskHighlights"] = ensureArray(
    wellness.highRiskHighlights
  ).map((item, index) => {
    const category = resolveHighlightCategory(item?.category);
    const numeric = toNumber(item?.questionNumber);
    const questionNumber = numeric > 0 ? Math.round(numeric) : undefined;
    const sectionId = toText(item?.sectionId) || undefined;
    const questionKey = resolveQuestionKey({
      questionKey: item?.questionKey,
      sectionId,
      questionNumber,
      category,
    });
    const answerText = resolvePreferredAnswerText({
      questionKey,
      rawAnswerText: item?.answerText,
      surveyAnswerText: questionKey ? surveyAnswerTextByQuestionKey.get(questionKey) : undefined,
      emptyFallback: "",
    });
    return {
      category,
      title: toText(item?.title) || `주의 항목 ${index + 1}`,
      score: clampPercent(toNumber(item?.score)),
      action: toText(item?.action),
      questionNumber,
      sectionId,
      questionKey: questionKey || undefined,
      questionText: toText(item?.questionText) || undefined,
      answerText: answerText || undefined,
    };
  });

  const supplementDesign: WellnessComputedResult["supplementDesign"] = ensureArray(
    wellness.supplementDesign
  ).map((item, index) => ({
    sectionId: toText(item?.sectionId) || `section-${index + 1}`,
    title: toText(item?.title),
    paragraphs: ensureArray(item?.paragraphs).map((paragraph) => toText(paragraph)).filter(Boolean),
    recommendedNutrients: ensureArray(item?.recommendedNutrients).map((nutrient, nutrientIndex) => ({
      code: toText(nutrient?.code) || `nutrient-${index + 1}-${nutrientIndex + 1}`,
      label: toText(nutrient?.label),
      labelKo: toText(nutrient?.labelKo) || undefined,
      aliases: ensureArray(nutrient?.aliases).map((alias) => toText(alias)).filter(Boolean),
    })),
  }));

  const selectedSectionsFromRows = sectionNeedRows.map((item) => item.sectionId);
  const selectedSections = ensureArray(wellness.selectedSections)
    .map((sectionId) => toText(sectionId))
    .filter(Boolean);
  const resolvedSelectedSections =
    selectedSections.length > 0 ? selectedSections : selectedSectionsFromRows;

  return {
    schemaVersion: toText(wellness.schemaVersion) || "wellness-score-v1",
    selectedSections: resolvedSelectedSections,
    lifestyleRisk: {
      domainScoresNormalized,
      domainScoresPercent,
      domains,
      overallPercent: clampPercent(toNumber(wellness.lifestyleRisk?.overallPercent)),
    },
    healthManagementNeed: {
      sectionNeedPercentById: Object.fromEntries(
        sectionNeedRows.map((section) => [section.sectionId, section.percent])
      ),
      sections: sectionNeedRows,
      averagePercent: clampPercent(toNumber(wellness.healthManagementNeed?.averagePercent)),
    },
    overallHealthScore: clampPercent(toNumber(wellness.overallHealthScore)),
    sectionAdvice,
    highRiskHighlights,
    lifestyleRoutineAdvice: ensureArray(wellness.lifestyleRoutineAdvice)
      .map((line) => toText(line))
      .filter(Boolean),
    supplementDesign,
    perQuestionScores: {
      common: wellness.perQuestionScores?.common ?? {},
      sections: wellness.perQuestionScores?.sections ?? {},
    },
  };
}

export function buildB2bIntegratedResultPreviewModel(
  payload: ReportSummaryPayload | null | undefined
): B2bIntegratedResultPreviewModel {
  const resultSummary = toWellnessResult(payload);
  return {
    resultSummary,
    sectionTitleMap: buildSectionTitleMap(resultSummary),
    healthMetrics: buildHealthMetrics(payload),
    medicationStatusMessage: toText(payload?.health?.medicationStatus?.message),
    medications: buildMedications(payload),
    pharmacistSummary: toText(payload?.pharmacist?.summary),
    pharmacistRecommendations: toText(payload?.pharmacist?.recommendations),
    pharmacistCautions: toText(payload?.pharmacist?.cautions),
  };
}
