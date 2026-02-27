import type { SurveyQuestion } from "../_lib/client-types";

export type ResolvedOption = {
  value: string;
  label: string;
  score?: number;
  isNoneOption?: boolean;
};

function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function normalizeVariantKey(question: SurveyQuestion, raw: unknown) {
  if (!question.variants || Object.keys(question.variants).length === 0) return null;
  const row = toAnswerRecord(raw);
  if (row && typeof row.variantId === "string" && row.variantId.trim().length > 0) {
    return row.variantId;
  }
  return "base";
}

export function listVariantKeys(question: SurveyQuestion) {
  if (!question.variants || Object.keys(question.variants).length === 0) return [];
  const keys = ["base", ...Object.keys(question.variants)];
  return [...new Set(keys)];
}

export function variantLabel(variantKey: string) {
  if (variantKey === "base") return "기본 옵션(옵션 키값)";
  if (variantKey.includes("paperPdf")) return "종이 설문지 옵션";
  return variantKey;
}

export function resolveVariantOptions(
  question: SurveyQuestion,
  variantKey: string | null
): { options: ResolvedOption[]; optionsPrefix?: string } {
  if (variantKey && variantKey !== "base" && question.variants?.[variantKey]?.options) {
    return {
      options: (question.variants[variantKey].options ?? []).map((option) => ({
        value: option.value,
        label: option.label,
        score: option.score,
        isNoneOption: false,
      })),
      optionsPrefix:
        question.variants[variantKey].optionsPrefix ?? question.optionsPrefix ?? undefined,
    };
  }
  return {
    options: question.options ?? [],
    optionsPrefix: question.optionsPrefix ?? undefined,
  };
}

export function clampByVariantOptions(
  values: string[],
  options: ResolvedOption[]
) {
  if (values.length === 0) return [];
  const optionSet = new Set(options.map((option) => option.value));
  return values.filter((item) => optionSet.has(item));
}

export function withVariantAnswer(
  variantKey: string | null,
  selectedValues: string[],
  options: ResolvedOption[],
  fallbackAnswerText = ""
) {
  const firstValue = selectedValues[0] ?? "";
  const labels = selectedValues
    .map((optionValue) => options.find((option) => option.value === optionValue)?.label || optionValue)
    .filter(Boolean);
  return {
    answerValue: firstValue || undefined,
    answerText: labels.join(", ") || fallbackAnswerText || undefined,
    selectedValues,
    variantId: variantKey ?? undefined,
  };
}

export function resolveGroupFieldValues(question: SurveyQuestion, raw: unknown) {
  const fields = question.fields ?? [];
  const record = toAnswerRecord(raw);
  const fieldValuesRecord =
    record?.fieldValues && typeof record.fieldValues === "object"
      ? (record.fieldValues as Record<string, unknown>)
      : null;

  return Object.fromEntries(
    fields.map((field) => {
      const fromFieldValues = fieldValuesRecord?.[field.id];
      const fromRoot = record?.[field.id];
      const nextValue = fromFieldValues ?? fromRoot;
      return [field.id, nextValue == null ? "" : String(nextValue)];
    })
  ) as Record<string, string>;
}

export function buildGroupAnswer(
  question: SurveyQuestion,
  fieldValues: Record<string, string>
) {
  const nonEmptyValues = Object.values(fieldValues)
    .map((item) => item.trim())
    .filter(Boolean);
  const answerText = (question.fields ?? [])
    .map((field) => {
      const value = fieldValues[field.id]?.trim() ?? "";
      if (!value) return null;
      return `${field.label} ${value}${field.unit ? ` ${field.unit}` : ""}`.trim();
    })
    .filter((item): item is string => Boolean(item))
    .join(", ");

  return {
    fieldValues,
    answerValue: answerText || undefined,
    answerText: answerText || undefined,
    selectedValues: nonEmptyValues,
  };
}
