import type { SurveyAnswerRow } from "./client-types";

function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
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
