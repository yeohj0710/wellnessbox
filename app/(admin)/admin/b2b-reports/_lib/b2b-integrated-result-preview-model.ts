import {
  clampPercent,
  resolvePreferredAnswerText,
  toTrimmedText,
} from "@/components/b2b/report-summary/card-insights";
import {
  buildReportSummaryHealthMetrics,
  buildReportSummaryMedicationReviewModel,
} from "@/components/b2b/report-summary/detail-data-model";
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
  viewEmployeeReport: "내 건강 리포트 보기",
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

export type B2bIntegratedSupplementDesign = {
  sectionId: string;
  sectionTitle: string;
  title: string;
  paragraphs: string[];
  recommendedNutrients: string[];
};

export type B2bIntegratedResultPreviewModel = {
  resultSummary: WellnessComputedResult | null;
  sectionTitleMap: Map<string, string>;
  healthMetrics: B2bIntegratedHealthMetric[];
  supplementDesigns: B2bIntegratedSupplementDesign[];
  medicationStatusMessage: string;
  medications: B2bIntegratedMedication[];
  pharmacistSummary: string;
  pharmacistRecommendations: string;
  pharmacistCautions: string;
};

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveHighlightCategory(value: unknown): HighlightCategory {
  const category = toTrimmedText(value) as HighlightCategory;
  return HIGHLIGHT_CATEGORY_SET.has(category) ? category : "section";
}

function resolveQuestionKey(input: {
  questionKey?: unknown;
  sectionId?: unknown;
  questionNumber?: number;
  category?: HighlightCategory;
}) {
  const directKey = toTrimmedText(input.questionKey);
  if (directKey) return directKey;

  if (typeof input.questionNumber !== "number" || !Number.isFinite(input.questionNumber)) {
    return "";
  }

  const normalizedNumber = Math.round(input.questionNumber);
  if (normalizedNumber <= 0) return "";

  if (input.category === "common") {
    return `C${String(normalizedNumber).padStart(2, "0")}`;
  }

  const sectionId = toTrimmedText(input.sectionId);
  if (!sectionId) return "";
  return `${sectionId}_Q${String(normalizedNumber).padStart(2, "0")}`;
}

function buildSurveyAnswerTextByQuestionKey(payload: ReportSummaryPayload | null | undefined) {
  const map = new Map<string, string>();
  for (const answer of ensureArray(payload?.survey?.answers)) {
    const questionKey = toTrimmedText(answer?.questionKey);
    if (!questionKey) continue;
    const answerText =
      toTrimmedText(answer?.answerText) || toTrimmedText(answer?.answerValue);
    if (!answerText) continue;
    map.set(questionKey, answerText);
  }
  return map;
}

function buildSectionTitleMap(resultSummary: WellnessComputedResult | null) {
  if (!resultSummary) return EMPTY_SECTION_TITLE_MAP;
  return new Map(
    resultSummary.healthManagementNeed.sections.map((section) => [
      section.sectionId,
      section.sectionTitle,
    ])
  );
}

function buildHealthMetrics(
  payload: ReportSummaryPayload | null | undefined
): B2bIntegratedHealthMetric[] {
  if (!payload) return [];
  return buildReportSummaryHealthMetrics(payload).map((metric) => ({
    label: metric.label,
    value: metric.value,
    status: metric.statusLabel || undefined,
  }));
}

function buildMedications(
  payload: ReportSummaryPayload | null | undefined
): B2bIntegratedMedication[] {
  if (!payload) return [];
  return buildReportSummaryMedicationReviewModel(payload).medications;
}

function buildSupplementDesigns(
  payload: ReportSummaryPayload | null | undefined,
  sectionTitleMap: Map<string, string>
): B2bIntegratedSupplementDesign[] {
  const supplementDesign = ensureArray(payload?.analysis?.wellness?.supplementDesign);

  return supplementDesign.map((item, index) => {
    const sectionId = toTrimmedText(item?.sectionId) || `section-${index + 1}`;
    const sectionTitle =
      sectionTitleMap.get(sectionId) || sectionId;
    const title = toTrimmedText(item?.title) || sectionTitle;

    return {
      sectionId,
      sectionTitle,
      title,
      paragraphs: ensureArray(item?.paragraphs)
        .map((paragraph) => toTrimmedText(paragraph))
        .filter(Boolean),
      recommendedNutrients: ensureArray(item?.recommendedNutrients)
        .map((nutrient) => toTrimmedText(nutrient?.labelKo) || toTrimmedText(nutrient?.label))
        .filter(Boolean),
    };
  });
}

function toWellnessResult(
  payload: ReportSummaryPayload | null | undefined
): WellnessComputedResult | null {
  const wellness = payload?.analysis?.wellness;
  if (!wellness) return null;

  const surveyAnswerTextByQuestionKey = buildSurveyAnswerTextByQuestionKey(payload);

  const domains = ensureArray(wellness.lifestyleRisk?.domains).map((domain, index) => ({
    id: toTrimmedText(domain?.id) || `domain-${index + 1}`,
    name: toTrimmedText(domain?.name) || toTrimmedText(domain?.id) || `영역 ${index + 1}`,
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
      sectionId: toTrimmedText(section?.sectionId) || `section-${index + 1}`,
      sectionTitle:
        toTrimmedText(section?.sectionTitle) ||
        toTrimmedText(section?.sectionId) ||
        `선택 영역 ${index + 1}`,
      percent: clampPercent(toNumber(section?.percent)),
    })
  );

  const sectionAdvice: WellnessComputedResult["sectionAdvice"] = {};
  const rawSectionAdvice = wellness.sectionAdvice ?? {};
  for (const [sectionId, sectionValue] of Object.entries(rawSectionAdvice)) {
    const sectionTitle = toTrimmedText(sectionValue?.sectionTitle) || sectionId;
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
        surveyAnswerText: questionKey
          ? surveyAnswerTextByQuestionKey.get(questionKey)
          : undefined,
        emptyFallback: "",
      });

      return {
        questionNumber,
        score: clampPercent(toNumber(item?.score)),
        text: toTrimmedText(item?.text),
        questionKey: questionKey || undefined,
        questionText: toTrimmedText(item?.questionText) || undefined,
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
    const sectionId = toTrimmedText(item?.sectionId) || undefined;
    const questionKey = resolveQuestionKey({
      questionKey: item?.questionKey,
      sectionId,
      questionNumber,
      category,
    });
    const answerText = resolvePreferredAnswerText({
      questionKey,
      rawAnswerText: item?.answerText,
      surveyAnswerText: questionKey
        ? surveyAnswerTextByQuestionKey.get(questionKey)
        : undefined,
      emptyFallback: "",
    });

    return {
      category,
      title: toTrimmedText(item?.title) || `주의 항목 ${index + 1}`,
      score: clampPercent(toNumber(item?.score)),
      action: toTrimmedText(item?.action),
      questionNumber,
      sectionId,
      questionKey: questionKey || undefined,
      questionText: toTrimmedText(item?.questionText) || undefined,
      answerText: answerText || undefined,
    };
  });

  const supplementDesign: WellnessComputedResult["supplementDesign"] = ensureArray(
    wellness.supplementDesign
  ).map((item, index) => ({
    sectionId: toTrimmedText(item?.sectionId) || `section-${index + 1}`,
    title: toTrimmedText(item?.title),
    paragraphs: ensureArray(item?.paragraphs)
      .map((paragraph) => toTrimmedText(paragraph))
      .filter(Boolean),
    recommendedNutrients: ensureArray(item?.recommendedNutrients).map(
      (nutrient, nutrientIndex) => ({
        code:
          toTrimmedText(nutrient?.code) ||
          `nutrient-${index + 1}-${nutrientIndex + 1}`,
        label: toTrimmedText(nutrient?.label),
        labelKo: toTrimmedText(nutrient?.labelKo) || undefined,
        aliases: ensureArray(nutrient?.aliases)
          .map((alias) => toTrimmedText(alias))
          .filter(Boolean),
      })
    ),
  }));

  const selectedSectionsFromRows = sectionNeedRows.map((item) => item.sectionId);
  const selectedSections = ensureArray(wellness.selectedSections)
    .map((sectionId) => toTrimmedText(sectionId))
    .filter(Boolean);
  const resolvedSelectedSections =
    selectedSections.length > 0 ? selectedSections : selectedSectionsFromRows;

  return {
    schemaVersion: toTrimmedText(wellness.schemaVersion) || "wellness-score-v1",
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
      .map((line) => toTrimmedText(line))
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
  const sectionTitleMap = buildSectionTitleMap(resultSummary);
  const medicationReviewModel = payload
    ? buildReportSummaryMedicationReviewModel(payload)
    : {
        medicationStatusMessage: "",
        medications: [],
        pharmacistSummary: "",
        pharmacistRecommendations: "",
        pharmacistCautions: "",
      };
  return {
    resultSummary,
    sectionTitleMap,
    healthMetrics: buildHealthMetrics(payload),
    supplementDesigns: buildSupplementDesigns(payload, sectionTitleMap),
    medicationStatusMessage: medicationReviewModel.medicationStatusMessage,
    medications: buildMedications(payload),
    pharmacistSummary: medicationReviewModel.pharmacistSummary,
    pharmacistRecommendations: medicationReviewModel.pharmacistRecommendations,
    pharmacistCautions: medicationReviewModel.pharmacistCautions,
  };
}
