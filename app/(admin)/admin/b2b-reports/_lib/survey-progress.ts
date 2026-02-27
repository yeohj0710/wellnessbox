import type {
  CompletionStats,
  SurveyAnswerRow,
  SurveyQuestion,
  SurveyTemplateSchema,
} from "./client-types";
import { toInputValue, toMultiValues } from "./client-utils";

export function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function isQuestionVisible(
  question: SurveyQuestion,
  answers: Record<string, unknown>
) {
  if (!question.displayIf?.field || !question.displayIf.equals) return true;
  const target = question.displayIf.equals.trim().toLowerCase();
  if (!target) return true;
  const raw = answers[question.displayIf.field];
  const candidateTokens = new Set<string>();
  const scalar = toInputValue(raw).trim().toLowerCase();
  if (scalar) candidateTokens.add(scalar);
  for (const item of toMultiValues(raw)) {
    const normalized = item.trim().toLowerCase();
    if (normalized) candidateTokens.add(normalized);
  }
  const record = toAnswerRecord(raw);
  if (record) {
    const answerValue = typeof record.answerValue === "string" ? record.answerValue : "";
    const answerText = typeof record.answerText === "string" ? record.answerText : "";
    const valueToken = answerValue.trim().toLowerCase();
    const textToken = answerText.trim().toLowerCase();
    if (valueToken) candidateTokens.add(valueToken);
    if (textToken) candidateTokens.add(textToken);
  }
  return candidateTokens.has(target);
}

export function hasAnswer(question: SurveyQuestion, rawValue: unknown) {
  if (question.type === "multi") {
    return toMultiValues(rawValue).length > 0;
  }
  if (question.type === "group") {
    const record = toAnswerRecord(rawValue);
    if (record?.fieldValues && typeof record.fieldValues === "object") {
      const fieldValues = record.fieldValues as Record<string, unknown>;
      const hasFilledField = Object.values(fieldValues).some(
        (value) => String(value ?? "").trim().length > 0
      );
      if (hasFilledField) return true;
    }
    return toInputValue(rawValue).trim().length > 0;
  }
  return toInputValue(rawValue).trim().length > 0;
}

function toStringArray(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === "string" ? item : String(item))).filter(Boolean);
}

export function mergeSurveyAnswers(input: {
  answersFromJson: Record<string, unknown>;
  answerRows?: SurveyAnswerRow[] | null;
}) {
  const { answersFromJson, answerRows } = input;
  if (!Array.isArray(answerRows) || answerRows.length === 0) {
    return { ...answersFromJson };
  }

  const answersFromRows = answerRows.reduce<Record<string, unknown>>((acc, row) => {
    const base = toAnswerRecord(answersFromJson[row.questionKey]) ?? {};
    const selectedValues = toStringArray(row.meta?.selectedValues);
    const fallbackSelectedValues = toStringArray(base.selectedValues);
    const variantId = typeof row.meta?.variantId === "string" ? row.meta?.variantId : undefined;
    acc[row.questionKey] = {
      ...base,
      answerText: row.answerText ?? undefined,
      answerValue: row.answerValue ?? undefined,
      selectedValues:
        selectedValues.length > 0
          ? selectedValues
          : fallbackSelectedValues.length > 0
          ? fallbackSelectedValues
          : undefined,
      variantId,
      score:
        typeof row.score === "number"
          ? row.score
          : typeof base.score === "number"
          ? base.score
          : undefined,
    };
    return acc;
  }, {});

  return {
    ...answersFromJson,
    ...answersFromRows,
  };
}

export function buildCompletionStats(input: {
  surveyTemplate: SurveyTemplateSchema | null;
  selectedSectionSet: Set<string>;
  surveyAnswers: Record<string, unknown>;
}): CompletionStats {
  const { surveyTemplate, selectedSectionSet, surveyAnswers } = input;
  if (!surveyTemplate) {
    return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
  }

  const activeQuestions = [
    ...surveyTemplate.common.filter((question) => isQuestionVisible(question, surveyAnswers)),
    ...surveyTemplate.sections
      .filter((section) => selectedSectionSet.has(section.key))
      .flatMap((section) =>
        section.questions.filter((question) => isQuestionVisible(question, surveyAnswers))
      ),
  ];

  const total = activeQuestions.length;
  const required = activeQuestions.filter((q) => q.required);
  const answered = activeQuestions.filter((question) =>
    hasAnswer(question, surveyAnswers[question.key])
  ).length;
  const requiredAnswered = required.filter((question) =>
    hasAnswer(question, surveyAnswers[question.key])
  ).length;

  return {
    total,
    answered,
    requiredTotal: required.length,
    requiredAnswered,
    percent: total > 0 ? Math.round((answered / total) * 100) : 0,
  };
}
