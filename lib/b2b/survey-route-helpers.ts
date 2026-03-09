import type { Prisma } from "@prisma/client";
import type { SurveyResponseRecord } from "@/lib/b2b/admin-report-contract";
import {
  normalizeSurveyAnswerValue,
  resolveSurveyQuestionScore,
  type SurveyQuestionDefinition,
} from "@/lib/b2b/survey-answer";
import {
  resolveSectionKeysFromC27Input,
  resolveSelectedSectionsByC27Policy,
} from "@/lib/b2b/survey-section-resolver";
import type { B2bSurveyTemplateSchema } from "@/lib/b2b/survey-template";
type SurveyAnswers = Record<string, unknown>;

type SurveyMaps = {
  commonMap: ReadonlyMap<string, SurveyQuestionDefinition>;
  sectionMap: ReadonlyMap<
    string,
    SurveyQuestionDefinition & { sectionKey: string }
  >;
};

export type SurveyPeriodRow = { periodKey: string | null };

type SurveyAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score: number | null;
  meta: unknown;
};

export type SurveyResponseRow = {
  id: string;
  periodKey: string | null;
  reportCycle: number | string | null;
  submittedAt: Date | null;
  selectedSections: string[];
  answersJson: unknown;
  updatedAt: Date;
  answers: SurveyAnswerRow[];
};

type JsonSerializer = (
  value: unknown
) => Prisma.InputJsonValue | Prisma.JsonNullValueInput;

export function resolveSurveySelectedSections(input: {
  schema: B2bSurveyTemplateSchema;
  answers: SurveyAnswers;
  selectedSections?: string[];
}) {
  const c27Key = input.schema.rules.selectSectionByCommonQuestionKey;
  const hasExplicitC27Answer = Object.prototype.hasOwnProperty.call(
    input.answers,
    c27Key
  );
  const q27Value = input.answers[c27Key] ?? null;
  const derivedSections = resolveSectionKeysFromC27Input(input.schema, q27Value);
  const maxSelectedSections = Math.max(
    1,
    input.schema.rules.maxSelectedSections || 5
  );
  return resolveSelectedSectionsByC27Policy({
    hasExplicitC27Answer,
    selectedSections: input.selectedSections,
    derivedSections,
    allowedSectionKeys: input.schema.sectionCatalog.map((section) => section.key),
    maxSelectedSections,
  });
}

export function pruneSurveyAnswersForSelectedSections(input: {
  answers: SurveyAnswers;
  maps: SurveyMaps;
  selectedSections: string[];
}) {
  const selectedSectionSet = new Set(input.selectedSections);
  const pruned: SurveyAnswers = {};

  for (const [questionKey, value] of Object.entries(input.answers)) {
    if (input.maps.commonMap.has(questionKey)) {
      pruned[questionKey] = value;
      continue;
    }
    const sectionQuestion = input.maps.sectionMap.get(questionKey);
    if (!sectionQuestion) continue;
    if (!selectedSectionSet.has(sectionQuestion.sectionKey)) continue;
    pruned[questionKey] = value;
  }

  return pruned;
}

export function buildSurveyAnswerRows(input: {
  responseId: string;
  answers: SurveyAnswers;
  maps: SurveyMaps;
  asJsonValue: JsonSerializer;
}) {
  return Object.entries(input.answers)
    .map(([questionKey, value]) => {
      const common = input.maps.commonMap.get(questionKey);
      const section = input.maps.sectionMap.get(questionKey);
      const question = common ?? section;
      if (!question) return null;

      const normalized = normalizeSurveyAnswerValue(value);
      const score = resolveSurveyQuestionScore(question, normalized);
      const answerMeta = {
        selectedValues: normalized.selectedValues,
        variantId: normalized.variantId ?? "base",
        lockedScore: score,
        fieldValues: normalized.fieldValues,
      };
      return {
        responseId: input.responseId,
        questionKey,
        sectionKey: section?.sectionKey ?? null,
        answerText: normalized.answerText,
        answerValue: normalized.answerValue,
        score,
        meta: input.asJsonValue(answerMeta),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function collectSurveyAvailablePeriods(rows: SurveyPeriodRow[]) {
  return [
    ...new Set(
      rows
        .map((row) => row.periodKey)
        .filter((row): row is string => Boolean(row))
    ),
  ];
}

export function serializeSurveyResponse(
  response: SurveyResponseRow
): SurveyResponseRecord {
  return {
    id: response.id,
    periodKey: response.periodKey,
    reportCycle: response.reportCycle,
    submittedAt: response.submittedAt?.toISOString() ?? null,
    selectedSections: response.selectedSections,
    answersJson: response.answersJson as SurveyResponseRecord["answersJson"],
    updatedAt: response.updatedAt.toISOString(),
    answers: response.answers.map((answer) => ({
      questionKey: answer.questionKey,
      sectionKey: answer.sectionKey,
      answerText: answer.answerText,
      answerValue: answer.answerValue,
      score: answer.score,
      meta:
        answer.meta as NonNullable<SurveyResponseRecord["answers"]>[number]["meta"],
    })),
  };
}
