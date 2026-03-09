import {
  extractAnalysisCoreMetrics,
  extractAnalysisExternalCards,
  extractAnalysisHealthRiskFlags,
  extractAnalysisSectionScores,
  extractAnalysisTopIssues,
  extractAnalysisTrendMonths,
  extractTextArray,
} from "@/lib/b2b/report-payload-analysis-helpers";
import {
  asRecord,
  toText,
} from "@/lib/b2b/report-payload-shared";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

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
    topIssues: extractAnalysisTopIssues(summary?.topIssues),
  };
}

export function extractAnalysisSurvey(payload: unknown): AnalysisSurvey {
  const record = asRecord(payload);
  const survey = asRecord(record?.survey);
  return {
    sectionScores: extractAnalysisSectionScores(survey?.sectionScores),
    overallScore: typeof survey?.overallScore === "number" ? survey.overallScore : null,
    topIssues: extractAnalysisTopIssues(survey?.topIssues),
  };
}

export function extractAnalysisHealth(payload: unknown): AnalysisHealth {
  const record = asRecord(payload);
  const health = asRecord(record?.health);
  return {
    coreMetrics: extractAnalysisCoreMetrics(health?.coreMetrics),
    riskFlags: extractAnalysisHealthRiskFlags(health?.riskFlags),
    abnormalFlags: extractTextArray(health?.abnormalFlags),
  };
}

export function extractAnalysisTrend(payload: unknown): AnalysisTrend {
  const record = asRecord(payload);
  const trend = asRecord(record?.trend);
  return { months: extractAnalysisTrendMonths(trend?.months) };
}

export function extractExternalCards(payload: unknown): AnalysisExternalCard[] {
  const record = asRecord(payload);
  const external = asRecord(record?.externalAnalysis);
  return extractAnalysisExternalCards(external?.cards);
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
    model: toText(ai.model) || DEFAULT_CHAT_MODEL,
    summary,
    monthlyGuide,
    actionItems: extractTextArray(ai.actionItems),
    caution: toText(ai.caution) || "",
  };
}

export function extractRiskFlags(payload: unknown): string[] {
  const analysis = asRecord(payload);
  return extractTextArray(analysis?.riskFlags);
}

export function extractRecommendations(payload: unknown): string[] {
  const analysis = asRecord(payload);
  return extractTextArray(analysis?.recommendations);
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
