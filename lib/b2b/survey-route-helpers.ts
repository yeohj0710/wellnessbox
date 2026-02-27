import type { Prisma } from "@prisma/client";
import {
  normalizeSurveyAnswerValue,
  resolveSurveyQuestionScore,
  type SurveyQuestionDefinition,
} from "@/lib/b2b/survey-answer";
import {
  resolveSectionKeysFromC27Input,
  type B2bSurveyTemplateSchema,
} from "@/lib/b2b/survey-template";

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
  const q27Value =
    input.answers[input.schema.rules.selectSectionByCommonQuestionKey] ?? null;
  const derivedSections = resolveSectionKeysFromC27Input(input.schema, q27Value);
  const allowedSectionKeys = new Set(
    input.schema.sectionCatalog.map((section) => section.key)
  );

  return [...new Set([...(input.selectedSections ?? []), ...derivedSections])].filter(
    (sectionKey) => allowedSectionKeys.has(sectionKey)
  );
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

export function serializeSurveyResponse(response: SurveyResponseRow) {
  return {
    id: response.id,
    periodKey: response.periodKey,
    reportCycle: response.reportCycle,
    selectedSections: response.selectedSections,
    answersJson: response.answersJson,
    updatedAt: response.updatedAt.toISOString(),
    answers: response.answers.map((answer) => ({
      questionKey: answer.questionKey,
      sectionKey: answer.sectionKey,
      answerText: answer.answerText,
      answerValue: answer.answerValue,
      score: answer.score,
      meta: answer.meta,
    })),
  };
}
