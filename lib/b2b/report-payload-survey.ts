import "server-only";

import type { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { monthRangeFromPeriodKey } from "@/lib/b2b/period";
import { asRecord, toText } from "@/lib/b2b/report-payload-shared";
import type { B2bReportPayload } from "@/lib/b2b/report-payload-types";
import { extractWellness } from "@/lib/b2b/report-payload-wellness";
import { pickMostCompleteSurveyResponse } from "@/lib/b2b/survey-response-completeness";
import { computeWellnessResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";

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

function splitAnswerTokens(value: string) {
  return value
    .split(/[,\n/|]/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function countWellnessSectionAdviceItems(wellness: ReportWellness | null | undefined) {
  if (!wellness) return 0;
  return Object.values(wellness.sectionAdvice ?? {}).reduce((sum, row) => {
    return sum + (Array.isArray(row?.items) ? row.items.length : 0);
  }, 0);
}

export function resolveSurveyQuestionText(questionKey: string) {
  const lookup = getSurveyQuestionLookupByKey().get(questionKey);
  const text = lookup?.text?.trim() ?? "";
  return text.length > 0 ? text : null;
}

export function normalizeSurveyAnswerText(input: {
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

export async function findBestSurveyByPeriodOrFallback(input: {
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

export function shouldPreferFallbackWellness(
  primary: ReportWellness,
  fallback: ReportWellness
) {
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

export function computeFallbackWellnessFromSurvey(
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
