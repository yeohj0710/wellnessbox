import "server-only";

import type { B2bSurveyTemplateSchema } from "@/lib/b2b/survey-template";
import { comparePeriodKeyDesc, normalizePeriodKey } from "@/lib/b2b/period";
import { buildHealth, buildMedication } from "@/lib/b2b/analyzer-health";
import {
  asRecord,
  clampScore,
  formatDateTime,
  splitTextList,
  toNumber,
  toText,
} from "@/lib/b2b/analyzer-helpers";
import { computeSurvey } from "@/lib/b2b/analyzer-survey";

type SurveyAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score?: number | null;
};

type SurveyResponseInput = {
  selectedSections: string[];
  answersJson: Record<string, unknown> | null;
  answers: SurveyAnswerRow[];
  updatedAt?: Date | string | null;
};

type HealthSnapshotInput = {
  normalizedJson: unknown;
  rawJson: unknown;
  sourceMode: string | null;
  fetchedAt?: Date | string | null;
};

type PharmacistNoteInput = {
  note: string | null;
  recommendations: string | null;
  cautions: string | null;
  updatedAt?: Date | string | null;
};

type HistoricalAnalysisInput = {
  periodKey: string;
  payload: unknown;
  computedAt?: Date | string | null;
};

export type B2bAiEvaluation = {
  generatedAt: string;
  model: string;
  summary: string;
  monthlyGuide: string;
  actionItems: string[];
  caution: string;
};

export type B2bAnalyzerInput = {
  periodKey: string;
  surveyTemplate: B2bSurveyTemplateSchema | null;
  surveyResponse: SurveyResponseInput | null;
  healthSnapshot: HealthSnapshotInput | null;
  pharmacistNote: PharmacistNoteInput | null;
  externalAnalysisPayload?: unknown;
  aiEvaluation?: B2bAiEvaluation | null;
  historicalAnalyses?: HistoricalAnalysisInput[];
};


function buildPharmacist(input: B2bAnalyzerInput) {
  const note = input.pharmacistNote;
  const summarySource = toText(note?.note) || "약사 코멘트가 아직 입력되지 않았습니다.";
  const summary = summarySource.length > 140 ? `${summarySource.slice(0, 139)}…` : summarySource;
  const recommendations = splitTextList(note?.recommendations, 4);
  const cautions = splitTextList(note?.cautions, 4);
  const dosingGuide =
    splitTextList(note?.note, 2).find((line) => /복용|식전|식후|취침|아침|저녁/i.test(line)) ||
    "복용 시간과 방법은 제품 라벨 및 약사 안내를 기준으로 지켜 주세요.";

  return {
    summary,
    recommendations,
    cautions,
    dosingGuide,
    updatedAt: formatDateTime(note?.updatedAt) ?? null,
  };
}

function summarizeExternalAnalysis(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { cards: [], raw: payload ?? null };
  }
  const record = payload as Record<string, unknown>;
  const cards = Object.entries(record)
    .slice(0, 8)
    .map(([key, value]) => {
      const text =
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
      return {
        key,
        title: key,
        value: text.length > 180 ? `${text.slice(0, 179)}…` : text,
      };
    });
  return { cards, raw: payload };
}

function extractHistoricalScores(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return null;
  const summary = asRecord(record.summary);
  const survey = asRecord(record.survey);
  const health = asRecord(record.health);

  const overallScore = toNumber(summary?.overallScore);
  const surveyScore = toNumber(survey?.overallScore);
  const healthScore = toNumber(health?.healthScore);
  if (overallScore == null && surveyScore == null && healthScore == null) return null;

  return {
    overallScore: overallScore ?? 0,
    surveyScore: surveyScore ?? 0,
    healthScore: healthScore ?? 0,
  };
}

function buildTrend(input: {
  periodKey: string;
  overallScore: number;
  surveyScore: number;
  healthScore: number;
  historicalAnalyses: HistoricalAnalysisInput[];
}) {
  const rows = input.historicalAnalyses
    .map((item) => {
      const periodKey = normalizePeriodKey(item.periodKey);
      if (!periodKey) return null;
      const scores = extractHistoricalScores(item.payload);
      if (!scores) return null;
      return { periodKey, ...scores };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  rows.push({
    periodKey: input.periodKey,
    overallScore: input.overallScore,
    surveyScore: input.surveyScore,
    healthScore: input.healthScore,
  });

  const byPeriod = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byPeriod.has(row.periodKey)) byPeriod.set(row.periodKey, row);
  }

  const months = [...byPeriod.values()]
    .sort((left, right) => comparePeriodKeyDesc(left.periodKey, right.periodKey))
    .slice(0, 6)
    .reverse();

  return { months };
}

function riskLevelFromOverallScore(score: number) {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

export type B2bComputedAnalysis = ReturnType<typeof analyzeB2bReport>;

export function analyzeB2bReport(input: B2bAnalyzerInput) {
  const nowIso = new Date().toISOString();
  const survey = computeSurvey(input);
  const health = buildHealth(input);
  const medication = buildMedication(input);
  const pharmacist = buildPharmacist(input);
  const externalAnalysis = summarizeExternalAnalysis(input.externalAnalysisPayload);

  const overallScore = clampScore(
    survey.overallScore * 0.5 + health.healthScore * 0.35 + medication.medicationScore * 0.15
  );
  const riskLevel = riskLevelFromOverallScore(overallScore);

  const riskFlags = [
    ...health.riskFlags.map((item) => item.reason),
    ...survey.topIssues.map((item) => `${item.title} 영역 점수가 낮습니다.`),
  ].slice(0, 5);

  const recommendations = [
    ...pharmacist.recommendations,
    ...survey.topIssues.map(
      (item) => `${item.title} 관련 생활습관 실천 목표를 이번 달 우선순위로 설정해 주세요.`
    ),
    ...health.riskFlags.map((item) => `${item.label} 지표를 다음 검진까지 추적해 주세요.`),
  ]
    .filter(Boolean)
    .slice(0, 6);

  const trend = buildTrend({
    periodKey: input.periodKey,
    overallScore,
    surveyScore: survey.overallScore,
    healthScore: health.healthScore,
    historicalAnalyses: input.historicalAnalyses || [],
  });

  return {
    schemaVersion: "b2b-analysis-v1",
    periodKey: input.periodKey,
    computedAt: nowIso,
    summary: {
      overallScore,
      surveyScore: survey.overallScore,
      healthScore: health.healthScore,
      medicationScore: medication.medicationScore,
      riskLevel,
      topIssues: survey.topIssues,
    },
    survey,
    health,
    medication,
    pharmacist,
    externalAnalysis,
    aiEvaluation: input.aiEvaluation || null,
    trend,
    riskFlags,
    recommendations,
  };
}
