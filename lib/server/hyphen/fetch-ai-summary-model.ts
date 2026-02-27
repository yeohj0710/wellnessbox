export type NhisAiRiskLevel = "low" | "medium" | "high" | "unknown";

export type NhisAiMetricInsight = {
  metric: string;
  value: string;
  interpretation: string;
  tip: string;
};

export type NhisAiSummary = {
  source: "openai" | "fallback";
  model: string;
  generatedAt: string;
  headline: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
  metricInsights: NhisAiMetricInsight[];
  riskLevel: NhisAiRiskLevel;
};

export type OpenAiSummaryDraft = {
  headline?: unknown;
  summary?: unknown;
  highlights?: unknown;
  nextSteps?: unknown;
  metricInsights?: unknown;
  riskLevel?: unknown;
};

export const NHIS_AI_MODEL = "gpt-4o-mini";
