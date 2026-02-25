import "server-only";

import db from "@/lib/db";
import { analyzeB2bReport } from "@/lib/b2b/analyzer";
import { generateB2bAiEvaluation } from "@/lib/b2b/ai-evaluation";
import {
  monthRangeFromPeriodKey,
  periodKeyToCycle,
  resolveCurrentPeriodKey,
} from "@/lib/b2b/period";
import { ensureActiveB2bSurveyTemplate } from "@/lib/b2b/survey-template";

type SaveAnalysisInput = {
  employeeId: string;
  periodKey?: string | null;
  externalAnalysisPayload?: unknown;
  generateAiEvaluation?: boolean;
  forceAiRegenerate?: boolean;
  replaceLatestPeriodEntry?: boolean;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function extractExistingAiEvaluation(payload: unknown) {
  const record = asRecord(payload);
  const ai = asRecord(record?.aiEvaluation);
  if (!ai) return null;
  const generatedAt =
    typeof ai.generatedAt === "string" ? ai.generatedAt : new Date().toISOString();
  const model = typeof ai.model === "string" ? ai.model : "gpt-4o-mini";
  const summary = typeof ai.summary === "string" ? ai.summary : "";
  const monthlyGuide = typeof ai.monthlyGuide === "string" ? ai.monthlyGuide : "";
  const caution = typeof ai.caution === "string" ? ai.caution : "";
  const actionItems = Array.isArray(ai.actionItems)
    ? ai.actionItems.filter((item): item is string => typeof item === "string")
    : [];
  if (!summary || !monthlyGuide) return null;
  return { generatedAt, model, summary, monthlyGuide, caution, actionItems };
}

function extractExternalAnalysisPayload(payload: unknown) {
  const record = asRecord(payload);
  const external = asRecord(record?.externalAnalysis);
  if (!external) return null;
  return external.raw ?? null;
}

function normalizePeriodKeyOrCurrent(periodKey?: string | null) {
  const text = typeof periodKey === "string" ? periodKey.trim() : "";
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return text;
  return resolveCurrentPeriodKey();
}

async function findLatestSurveyForPeriod(employeeId: string, periodKey: string) {
  const periodRow = await db.b2bSurveyResponse.findFirst({
    where: { employeeId, periodKey },
    include: { answers: true },
    orderBy: { updatedAt: "desc" },
  });
  if (periodRow) return periodRow;

  const range = monthRangeFromPeriodKey(periodKey);
  if (!range) return null;
  return db.b2bSurveyResponse.findFirst({
    where: {
      employeeId,
      updatedAt: { lt: range.to },
    },
    include: { answers: true },
    orderBy: { updatedAt: "desc" },
  });
}

async function findLatestHealthForPeriod(employeeId: string, periodKey: string) {
  const range = monthRangeFromPeriodKey(periodKey);
  if (!range) return null;
  return db.b2bHealthDataSnapshot.findFirst({
    where: {
      employeeId,
      fetchedAt: { lt: range.to },
    },
    orderBy: { fetchedAt: "desc" },
  });
}

async function findLatestNoteForPeriod(employeeId: string, periodKey: string) {
  const periodRow = await db.b2bPharmacistNote.findFirst({
    where: { employeeId, periodKey },
    orderBy: { updatedAt: "desc" },
  });
  if (periodRow) return periodRow;

  const range = monthRangeFromPeriodKey(periodKey);
  if (!range) return null;
  return db.b2bPharmacistNote.findFirst({
    where: {
      employeeId,
      updatedAt: { lt: range.to },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function loadHistoricalAnalyses(employeeId: string, periodKey: string) {
  return db.b2bAnalysisResult.findMany({
    where: {
      employeeId,
      periodKey: { not: periodKey },
    },
    orderBy: [{ periodKey: "desc" }, { updatedAt: "desc" }],
    take: 18,
    select: {
      periodKey: true,
      payload: true,
      computedAt: true,
    },
  });
}

async function resolveNextAnalysisVersion(employeeId: string) {
  const latest = await db.b2bAnalysisResult.findFirst({
    where: { employeeId },
    orderBy: [{ version: "desc" }],
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}

export async function computeAndSaveB2bAnalysis(input: SaveAnalysisInput) {
  const periodKey = normalizePeriodKeyOrCurrent(input.periodKey);
  const reportCycle = periodKeyToCycle(periodKey);

  const [templateState, survey, health, note, latestPeriodAnalysis, historical] =
    await Promise.all([
      ensureActiveB2bSurveyTemplate(),
      findLatestSurveyForPeriod(input.employeeId, periodKey),
      findLatestHealthForPeriod(input.employeeId, periodKey),
      findLatestNoteForPeriod(input.employeeId, periodKey),
      db.b2bAnalysisResult.findFirst({
        where: { employeeId: input.employeeId, periodKey },
        orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
      }),
      loadHistoricalAnalyses(input.employeeId, periodKey),
    ]);

  const existingExternalPayload =
    input.externalAnalysisPayload !== undefined
      ? input.externalAnalysisPayload
      : extractExternalAnalysisPayload(latestPeriodAnalysis?.payload);

  const shouldReuseAi =
    input.generateAiEvaluation !== true &&
    input.forceAiRegenerate !== true &&
    latestPeriodAnalysis;
  const existingAi = shouldReuseAi
    ? extractExistingAiEvaluation(latestPeriodAnalysis.payload)
    : null;
  const shouldGenerateAiEvaluation =
    input.forceAiRegenerate === true ||
    input.generateAiEvaluation === true ||
    (!existingAi && input.generateAiEvaluation !== false);

  const draft = analyzeB2bReport({
    periodKey,
    surveyTemplate: templateState.schema,
    surveyResponse: survey
      ? {
          selectedSections: survey.selectedSections,
          answersJson: asRecord(survey.answersJson),
          answers: survey.answers.map((answer) => ({
            questionKey: answer.questionKey,
            sectionKey: answer.sectionKey ?? null,
            answerText: answer.answerText ?? null,
            answerValue: answer.answerValue ?? null,
            score: typeof answer.score === "number" ? answer.score : null,
          })),
          updatedAt: survey.updatedAt,
        }
      : null,
    healthSnapshot: health
      ? {
          normalizedJson: health.normalizedJson,
          rawJson: health.rawJson,
          sourceMode: health.sourceMode,
          fetchedAt: health.fetchedAt,
        }
      : null,
    pharmacistNote: note
      ? {
          note: note.note ?? null,
          recommendations: note.recommendations ?? null,
          cautions: note.cautions ?? null,
          updatedAt: note.updatedAt,
        }
      : null,
    externalAnalysisPayload: existingExternalPayload,
    aiEvaluation: existingAi,
    historicalAnalyses: historical
      .map((row) => ({
        periodKey: row.periodKey ?? "",
        payload: row.payload,
        computedAt: row.computedAt,
      }))
      .filter((row) => row.periodKey),
  });

  let computed = draft;
  if (shouldGenerateAiEvaluation) {
    const aiEvaluation = await generateB2bAiEvaluation({
      periodKey,
      summary: {
        overallScore: computed.summary.overallScore,
        surveyScore: computed.summary.surveyScore,
        healthScore: computed.summary.healthScore,
        medicationScore: computed.summary.medicationScore,
        riskLevel: computed.summary.riskLevel,
      },
      topIssues: computed.summary.topIssues,
      riskFlags: computed.riskFlags,
      recommendations: computed.recommendations,
      trend: computed.trend.months,
    });
    computed = {
      ...computed,
      aiEvaluation,
    };
  }

  const replaceLatestPeriodEntry = input.replaceLatestPeriodEntry !== false;
  if (replaceLatestPeriodEntry && latestPeriodAnalysis) {
    const updated = await db.b2bAnalysisResult.update({
      where: { id: latestPeriodAnalysis.id },
      data: {
        payload: JSON.parse(JSON.stringify(computed)),
        computedAt: new Date(computed.computedAt),
        periodKey,
        reportCycle: reportCycle ?? null,
      },
    });
    return { analysis: updated, computed };
  }

  const version = await resolveNextAnalysisVersion(input.employeeId);
  const created = await db.b2bAnalysisResult.create({
    data: {
      employeeId: input.employeeId,
      version,
      payload: JSON.parse(JSON.stringify(computed)),
      computedAt: new Date(computed.computedAt),
      periodKey,
      reportCycle: reportCycle ?? null,
    },
  });
  return { analysis: created, computed };
}
