import {
  asRecord,
  toText,
  type JsonRecord,
} from "@/lib/b2b/report-payload-shared";

export type AnalysisSummary = {
  overallScore: number | null;
  surveyScore: number | null;
  healthScore: number | null;
  medicationScore: number | null;
  riskLevel: string;
  topIssues: Array<{
    sectionKey: string;
    title: string;
    score: number;
  }>;
};

export type AnalysisSurvey = {
  sectionScores: Array<{
    sectionKey: string;
    sectionTitle: string;
    score: number;
    answeredCount: number;
    questionCount: number;
  }>;
  overallScore: number | null;
  topIssues: Array<{
    sectionKey: string;
    title: string;
    score: number;
  }>;
};

export type AnalysisHealth = {
  coreMetrics: Array<{
    key: string;
    label: string;
    value: string;
    unit: string | null;
    status: string;
  }>;
  riskFlags: Array<{
    key: string;
    label: string;
    severity: string;
    value: string;
    reason: string;
  }>;
  abnormalFlags: string[];
};

export type AnalysisTrend = {
  months: Array<{
    periodKey: string;
    overallScore: number;
    surveyScore: number;
    healthScore: number;
  }>;
};

export type AnalysisExternalCard = {
  key: string;
  title: string;
  value: string;
};

export type AnalysisAiEvaluation = {
  generatedAt: string;
  model: string;
  summary: string;
  monthlyGuide: string;
  actionItems: string[];
  caution: string;
};

export function extractAnalysisSummary(payload: unknown): AnalysisSummary {
  const record = asRecord(payload);
  const summary = asRecord(record?.summary);
  return {
    overallScore: typeof summary?.overallScore === "number" ? summary.overallScore : null,
    surveyScore: typeof summary?.surveyScore === "number" ? summary.surveyScore : null,
    healthScore: typeof summary?.healthScore === "number" ? summary.healthScore : null,
    medicationScore:
      typeof summary?.medicationScore === "number" ? summary.medicationScore : null,
    riskLevel: typeof summary?.riskLevel === "string" ? summary.riskLevel : "unknown",
    topIssues: Array.isArray(summary?.topIssues)
      ? summary.topIssues
          .map((item) => asRecord(item))
          .filter((item): item is JsonRecord => Boolean(item))
          .map((item) => ({
            sectionKey: toText(item.sectionKey) || "-",
            title: toText(item.title) || "이슈",
            score:
              typeof item.score === "number"
                ? item.score
                : Number(toText(item.score) || 0),
          }))
      : [],
  };
}

export function extractAnalysisSurvey(payload: unknown): AnalysisSurvey {
  const record = asRecord(payload);
  const survey = asRecord(record?.survey);
  const sectionScores = Array.isArray(survey?.sectionScores)
    ? survey.sectionScores
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          sectionKey: toText(item.sectionKey) || "-",
          sectionTitle: toText(item.sectionTitle) || toText(item.sectionKey) || "-",
          score:
            typeof item.score === "number"
              ? item.score
              : Number(toText(item.score) || 0),
          answeredCount: typeof item.answeredCount === "number" ? item.answeredCount : 0,
          questionCount: typeof item.questionCount === "number" ? item.questionCount : 0,
        }))
    : [];

  return {
    sectionScores,
    overallScore: typeof survey?.overallScore === "number" ? survey.overallScore : null,
    topIssues: Array.isArray(survey?.topIssues)
      ? survey.topIssues
          .map((item) => asRecord(item))
          .filter((item): item is JsonRecord => Boolean(item))
          .map((item) => ({
            sectionKey: toText(item.sectionKey) || "-",
            title: toText(item.title) || "이슈",
            score:
              typeof item.score === "number"
                ? item.score
                : Number(toText(item.score) || 0),
          }))
      : [],
  };
}

export function extractAnalysisHealth(payload: unknown): AnalysisHealth {
  const record = asRecord(payload);
  const health = asRecord(record?.health);
  const coreMetrics = Array.isArray(health?.coreMetrics)
    ? health.coreMetrics
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          label: toText(item.label) || "-",
          value: toText(item.value) || "-",
          unit: toText(item.unit) || null,
          status: toText(item.status) || "unknown",
        }))
    : [];

  const riskFlags = Array.isArray(health?.riskFlags)
    ? health.riskFlags
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          label: toText(item.label) || "-",
          severity: toText(item.severity) || "unknown",
          value: toText(item.value) || "-",
          reason: toText(item.reason) || "",
        }))
    : [];

  const abnormalFlags = Array.isArray(health?.abnormalFlags)
    ? health.abnormalFlags.map((item) => toText(item)).filter(Boolean)
    : [];

  return { coreMetrics, riskFlags, abnormalFlags };
}

export function extractAnalysisTrend(payload: unknown): AnalysisTrend {
  const record = asRecord(payload);
  const trend = asRecord(record?.trend);
  const months = Array.isArray(trend?.months)
    ? trend.months
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          periodKey: toText(item.periodKey) || "-",
          overallScore: typeof item.overallScore === "number" ? item.overallScore : 0,
          surveyScore: typeof item.surveyScore === "number" ? item.surveyScore : 0,
          healthScore: typeof item.healthScore === "number" ? item.healthScore : 0,
        }))
    : [];
  return { months };
}

export function extractExternalCards(payload: unknown): AnalysisExternalCard[] {
  const record = asRecord(payload);
  const external = asRecord(record?.externalAnalysis);
  const cards = Array.isArray(external?.cards)
    ? external.cards
        .map((item) => asRecord(item))
        .filter((item): item is JsonRecord => Boolean(item))
        .map((item) => ({
          key: toText(item.key) || "-",
          title: toText(item.title) || toText(item.key) || "-",
          value: toText(item.value) || "",
        }))
    : [];
  return cards;
}

export function extractAiEvaluation(payload: unknown): AnalysisAiEvaluation | null {
  const record = asRecord(payload);
  const ai = asRecord(record?.aiEvaluation);
  if (!ai) return null;
  const summary = toText(ai.summary);
  const monthlyGuide = toText(ai.monthlyGuide);
  if (!summary || !monthlyGuide) return null;
  return {
    generatedAt: toText(ai.generatedAt) || new Date().toISOString(),
    model: toText(ai.model) || "gpt-4o-mini",
    summary,
    monthlyGuide,
    actionItems: Array.isArray(ai.actionItems)
      ? ai.actionItems.map((item) => toText(item)).filter(Boolean)
      : [],
    caution: toText(ai.caution) || "",
  };
}

export function extractRiskFlags(payload: unknown): string[] {
  const analysis = asRecord(payload);
  return Array.isArray(analysis?.riskFlags)
    ? analysis.riskFlags.map((item) => toText(item)).filter(Boolean)
    : [];
}

export function extractRecommendations(payload: unknown): string[] {
  const analysis = asRecord(payload);
  return Array.isArray(analysis?.recommendations)
    ? analysis.recommendations.map((item) => toText(item)).filter(Boolean)
    : [];
}

export function extractPharmacistSummary(payload: unknown): {
  summary: string;
  dosingGuide: string;
} {
  const analysis = asRecord(payload);
  const pharmacist = asRecord(analysis?.pharmacist);
  return {
    summary: toText(pharmacist?.summary),
    dosingGuide: toText(pharmacist?.dosingGuide),
  };
}
