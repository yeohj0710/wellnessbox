import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { maskBirthDate, maskPhone } from "@/lib/b2b/identity";
import { monthRangeFromPeriodKey, periodKeyToCycle } from "@/lib/b2b/period";
import {
  extractAiEvaluation,
  extractAnalysisHealth,
  extractAnalysisSummary,
  extractAnalysisSurvey,
  extractAnalysisTrend,
  extractExternalCards,
} from "@/lib/b2b/report-payload-analysis";
import {
  extractHealthMetrics,
  parseFetchFlags,
} from "@/lib/b2b/report-payload-health";
import {
  buildCredibleTopIssues,
  resolveMedicationStatus,
} from "@/lib/b2b/report-payload-issues";
import { resolveReportMedicationRows } from "@/lib/b2b/report-payload-medication";
import {
  asRecord,
  toText,
} from "@/lib/b2b/report-payload-shared";
import type { B2bReportPayload } from "@/lib/b2b/report-payload-types";
import { extractWellness } from "@/lib/b2b/report-payload-wellness";
import { resolveReportScores } from "@/lib/b2b/report-score-engine";
import { pickMostCompleteSurveyResponse } from "@/lib/b2b/survey-response-completeness";
import { computeWellnessResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";

export const B2B_REPORT_PAYLOAD_VERSION = 15;

type SurveyQuestionLookup = {
  text: string;
  optionLabelByValue: Map<string, string>;
};

type SurveyResponseWithAnswers = Prisma.B2bSurveyResponseGetPayload<{
  include: {
    answers: {
      orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }];
    };
  };
}>;

type ReportWellness = B2bReportPayload["analysis"]["wellness"];

let surveyQuestionLookupByKeyCache: Map<string, SurveyQuestionLookup> | null = null;

function getSurveyQuestionLookupByKey() {
  if (surveyQuestionLookupByKeyCache) return surveyQuestionLookupByKeyCache;

  const template = loadWellnessTemplateForB2b();
  const map = new Map<string, SurveyQuestionLookup>();
  const allQuestions = [
    ...template.common,
    ...template.sections.flatMap((section) => section.questions),
  ];

  for (const question of allQuestions) {
    map.set(question.key, {
      text: question.text,
      optionLabelByValue: new Map(
        (question.options ?? []).map((option) => [option.value, option.label] as const)
      ),
    });
  }

  surveyQuestionLookupByKeyCache = map;
  return map;
}

function resolveSurveyQuestionText(questionKey: string) {
  const lookup = getSurveyQuestionLookupByKey().get(questionKey);
  const text = lookup?.text?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function splitAnswerTokens(value: string) {
  return value
    .split(/[,\n/|]/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeSurveyAnswerText(input: {
  questionKey: string;
  answerText: string | null;
  answerValue: string | null;
}) {
  const fallback = toText(input.answerText) || toText(input.answerValue) || null;
  const lookup = getSurveyQuestionLookupByKey().get(input.questionKey);
  if (!lookup) return fallback;

  const raw = toText(input.answerValue) || toText(input.answerText) || "";
  if (!raw) return fallback;
  const tokens = splitAnswerTokens(raw);
  if (tokens.length === 0) return fallback;

  const labels = tokens.map((token) => lookup.optionLabelByValue.get(token) ?? token);
  const normalized = labels.join(", ").trim();
  return normalized.length > 0 ? normalized : fallback;
}

async function findLatestByPeriodOrFallback<T>(input: {
  periodKey: string;
  exactFinder: () => Promise<T | null>;
  fallbackFinder: (to: Date) => Promise<T | null>;
}) {
  const exact = await input.exactFinder();
  if (exact) return exact;
  const range = monthRangeFromPeriodKey(input.periodKey);
  if (!range) return null;
  return input.fallbackFinder(range.to);
}

async function findBestSurveyByPeriodOrFallback(input: {
  employeeId: string;
  periodKey: string;
}) {
  const periodRows = await db.b2bSurveyResponse.findMany({
    where: {
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      submittedAt: { not: null },
    },
    include: {
      answers: {
        orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  const exact = pickMostCompleteSurveyResponse(periodRows);
  if (exact) return exact;

  const range = monthRangeFromPeriodKey(input.periodKey);
  if (!range) return null;

  const fallbackRows = await db.b2bSurveyResponse.findMany({
    where: {
      employeeId: input.employeeId,
      submittedAt: { not: null },
      updatedAt: { lt: range.to },
    },
    include: {
      answers: {
        orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  return pickMostCompleteSurveyResponse(fallbackRows);
}

function countWellnessSectionAdviceItems(wellness: ReportWellness | null | undefined) {
  if (!wellness) return 0;
  return Object.values(wellness.sectionAdvice ?? {}).reduce((sum, row) => {
    return sum + (Array.isArray(row?.items) ? row.items.length : 0);
  }, 0);
}

function shouldPreferFallbackWellness(primary: ReportWellness, fallback: ReportWellness) {
  if (!fallback) return false;
  if (!primary) return true;

  const primarySectionAdviceCount = countWellnessSectionAdviceItems(primary);
  const fallbackSectionAdviceCount = countWellnessSectionAdviceItems(fallback);
  if (fallbackSectionAdviceCount > primarySectionAdviceCount) return true;

  const primarySupplementCount = primary.supplementDesign?.length ?? 0;
  const fallbackSupplementCount = fallback.supplementDesign?.length ?? 0;
  if (fallbackSupplementCount > primarySupplementCount) return true;

  const primaryNeedSectionCount = primary.healthManagementNeed?.sections?.length ?? 0;
  const fallbackNeedSectionCount = fallback.healthManagementNeed?.sections?.length ?? 0;
  if (fallbackNeedSectionCount > primaryNeedSectionCount) return true;

  const primaryRoutineCount = primary.lifestyleRoutineAdvice?.length ?? 0;
  const fallbackRoutineCount = fallback.lifestyleRoutineAdvice?.length ?? 0;
  if (fallbackRoutineCount > primaryRoutineCount) return true;

  return false;
}

function computeFallbackWellnessFromSurvey(
  survey: SurveyResponseWithAnswers | null
): ReportWellness {
  if (!survey) return null;

  const computed = computeWellnessResult({
    selectedSections: survey.selectedSections ?? [],
    answersJson: asRecord(survey.answersJson) ?? null,
    answers: survey.answers.map((answer) => ({
      questionKey: answer.questionKey,
      sectionKey: answer.sectionKey ?? null,
      answerText: answer.answerText ?? null,
      answerValue: answer.answerValue ?? null,
      score: typeof answer.score === "number" ? answer.score : null,
      meta: answer.meta ?? null,
    })),
  });

  return extractWellness({ wellness: computed });
}

export type { B2bReportPayload } from "@/lib/b2b/report-payload-types";

export async function buildB2bReportPayload(input: {
  employeeId: string;
  periodKey: string;
  variantIndex: number;
  stylePreset: string;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);

  const employee = await db.b2bEmployee.findUnique({
    where: { id: input.employeeId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  const [latestHealth, latestSurvey, latestAnalysis, latestNote] = await Promise.all([
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bHealthDataSnapshot.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: { fetchedAt: "desc" },
        }),
      fallbackFinder: (to) =>
        db.b2bHealthDataSnapshot.findFirst({
          where: { employeeId: input.employeeId, fetchedAt: { lt: to } },
          orderBy: { fetchedAt: "desc" },
        }),
    }),
    findBestSurveyByPeriodOrFallback({
      employeeId: input.employeeId,
      periodKey: input.periodKey,
    }),
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bAnalysisResult.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        }),
      fallbackFinder: (to) =>
        db.b2bAnalysisResult.findFirst({
          where: { employeeId: input.employeeId, updatedAt: { lt: to } },
          orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        }),
    }),
    findLatestByPeriodOrFallback({
      periodKey: input.periodKey,
      exactFinder: () =>
        db.b2bPharmacistNote.findFirst({
          where: { employeeId: input.employeeId, periodKey: input.periodKey },
          orderBy: { updatedAt: "desc" },
        }),
      fallbackFinder: (to) =>
        db.b2bPharmacistNote.findFirst({
          where: { employeeId: input.employeeId, updatedAt: { lt: to } },
          orderBy: { updatedAt: "desc" },
        }),
    }),
  ]);

  const metrics = extractHealthMetrics(latestHealth?.normalizedJson);
  const medicationResolution = await resolveReportMedicationRows({
    employeeId: input.employeeId,
    periodKey: input.periodKey,
    latestSnapshotId: latestHealth?.id ?? null,
    normalizedJson: latestHealth?.normalizedJson,
    rawJson: latestHealth?.rawJson,
  });
  const medications = medicationResolution.rows;
  const fetchStatus = parseFetchFlags(latestHealth?.rawJson);
  const medicationStatus = resolveMedicationStatus({
    medications,
    containerState: medicationResolution.containerState,
    sourceMode: latestHealth?.sourceMode ?? null,
    rawJson: latestHealth?.rawJson,
  });

  const analysisSummary = extractAnalysisSummary(latestAnalysis?.payload);
  const analysisSurvey = extractAnalysisSurvey(latestAnalysis?.payload);
  const analysisHealth = extractAnalysisHealth(latestAnalysis?.payload);
  const analysisTrend = extractAnalysisTrend(latestAnalysis?.payload);
  const externalCards = extractExternalCards(latestAnalysis?.payload);
  const aiEvaluation = extractAiEvaluation(latestAnalysis?.payload);
  const extractedWellness = extractWellness(latestAnalysis?.payload);
  const computedFallbackWellness = computeFallbackWellnessFromSurvey(latestSurvey);
  const wellness = shouldPreferFallbackWellness(extractedWellness, computedFallbackWellness)
    ? computedFallbackWellness
    : extractedWellness;
  const scoreResolution = resolveReportScores({
    analysisSummary,
    analysisSurveyOverallScore: analysisSurvey.overallScore,
    surveySectionScores: analysisSurvey.sectionScores,
    healthCoreMetrics: analysisHealth.coreMetrics,
    medicationStatusType: medicationStatus.type,
    medicationCount: medications.length,
  });
  const analysisRecord = asRecord(latestAnalysis?.payload);

  const riskFlagsFromPayload = Array.isArray(analysisRecord?.riskFlags)
    ? analysisRecord.riskFlags.map((item) => toText(item)).filter(Boolean)
    : [];
  const riskFlags =
    riskFlagsFromPayload.length > 0
      ? riskFlagsFromPayload
      : analysisHealth.riskFlags
          .map((item) => toText(item.reason) || toText(item.label))
          .filter(Boolean);
  const recommendationsFromPayload = Array.isArray(analysisRecord?.recommendations)
    ? analysisRecord.recommendations.map((item) => toText(item)).filter(Boolean)
    : [];
  const credibleTopIssues = buildCredibleTopIssues({
    scoreDetails: scoreResolution.details,
    analysisSummaryTopIssues: analysisSummary.topIssues,
    surveySectionScores: analysisSurvey.sectionScores,
    healthRiskFlags: analysisHealth.riskFlags,
    healthCoreMetrics: analysisHealth.coreMetrics,
    medicationStatus,
    fetchStatus,
  });
  const recommendations = [
    ...recommendationsFromPayload,
    ...credibleTopIssues
      .map((item) =>
        item.reason ? `${item.title}: ${item.reason}` : item.title
      )
      .filter(Boolean),
  ].filter((item, index, source) => source.indexOf(item) === index);

  const pharmacistRecord = asRecord(latestAnalysis?.payload)?.pharmacist;
  const pharmacistSummary = asRecord(pharmacistRecord);

  const payload: B2bReportPayload = {
    meta: {
      employeeId: employee.id,
      employeeName: employee.name,
      birthDateMasked: maskBirthDate(employee.birthDate),
      phoneMasked: maskPhone(employee.phoneNormalized),
      generatedAt: new Date().toISOString(),
      payloadVersion: B2B_REPORT_PAYLOAD_VERSION,
      periodKey: input.periodKey,
      reportCycle,
      variantIndex: input.variantIndex,
      stylePreset: input.stylePreset,
      sourceMode: latestHealth?.sourceMode ?? null,
      isMockData: latestHealth?.sourceMode === "mock",
    },
    health: {
      fetchedAt: latestHealth?.fetchedAt?.toISOString() ?? null,
      metrics,
      coreMetrics: analysisHealth.coreMetrics,
      riskFlags: analysisHealth.riskFlags,
      abnormalFlags: analysisHealth.abnormalFlags,
      medications,
      fetchStatus,
      medicationStatus,
    },
    survey: {
      templateVersion: latestSurvey?.templateVersion ?? null,
      selectedSections: latestSurvey?.selectedSections ?? [],
      sectionScores: analysisSurvey.sectionScores,
      overallScore: scoreResolution.summary.surveyScore,
      topIssues: credibleTopIssues,
      answers:
        latestSurvey?.answers.map((answer) => ({
          questionKey: answer.questionKey,
          sectionKey: answer.sectionKey ?? null,
          questionText: resolveSurveyQuestionText(answer.questionKey),
          answerText: normalizeSurveyAnswerText({
            questionKey: answer.questionKey,
            answerText: answer.answerText ?? null,
            answerValue: answer.answerValue ?? null,
          }),
          answerValue: answer.answerValue ?? null,
        })) ?? [],
      updatedAt: latestSurvey?.updatedAt?.toISOString() ?? null,
    },
    analysis: {
      version: latestAnalysis?.version ?? null,
      periodKey: latestAnalysis?.periodKey ?? input.periodKey,
      reportCycle:
        latestAnalysis?.reportCycle ??
        periodKeyToCycle(latestAnalysis?.periodKey ?? input.periodKey),
      payload: latestAnalysis?.payload ?? null,
      summary: {
        overallScore: scoreResolution.summary.overallScore,
        surveyScore: scoreResolution.summary.surveyScore,
        healthScore: scoreResolution.summary.healthScore,
        medicationScore: scoreResolution.summary.medicationScore,
        riskLevel: scoreResolution.summary.riskLevel,
        topIssues: credibleTopIssues,
      },
      scoreDetails: scoreResolution.details,
      scoreEngineVersion: scoreResolution.version,
      riskFlags,
      recommendations: recommendations.slice(0, 6),
      trend: analysisTrend,
      externalCards,
      aiEvaluation,
      wellness,
      updatedAt:
        latestAnalysis?.updatedAt?.toISOString() ??
        latestAnalysis?.createdAt?.toISOString() ??
        null,
    },
    pharmacist: {
      note: latestNote?.note ?? null,
      recommendations: latestNote?.recommendations ?? null,
      cautions: latestNote?.cautions ?? null,
      summary: toText(pharmacistSummary?.summary) || latestNote?.note || null,
      dosingGuide: toText(pharmacistSummary?.dosingGuide) || null,
      updatedAt: latestNote?.updatedAt?.toISOString() ?? null,
    },
  };

  return payload;
}
