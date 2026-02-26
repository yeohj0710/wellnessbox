import "server-only";

import { optionScoreByValue } from "@/lib/b2b/demo-seed-builders";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

type NormalizedSeedAnswerValue = {
  answerText: string | null;
  answerValue: string | null;
  selectedValues: string[];
  submittedScore: number | null;
  variantId: string | null;
  fieldValues: Record<string, string> | null;
};

export function normalizeSeedAnswerValue(raw: unknown): NormalizedSeedAnswerValue {
  if (raw == null) {
    return {
      answerText: null as string | null,
      answerValue: null as string | null,
      selectedValues: [],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (Array.isArray(raw)) {
    const selectedValues = raw.map((item) => toText(item)).filter(Boolean);
    const joined = selectedValues.join(", ");
    return {
      answerText: joined || null,
      answerValue: joined || null,
      selectedValues,
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = toText(raw);
    return {
      answerText: text || null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }

  const record = raw as Record<string, unknown>;
  const answerText = toText(record.answerText ?? record.text) || null;
  const answerValue = toText(record.answerValue ?? record.value) || null;
  const selectedValues = Array.isArray(record.selectedValues)
    ? record.selectedValues.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(record.values)
    ? record.values.map((item) => toText(item)).filter(Boolean)
    : [];
  const submittedScore =
    typeof record.score === "number" && Number.isFinite(record.score)
      ? Number(clamp01(record.score).toFixed(4))
      : null;
  const variantId = toText(record.variantId) || null;
  const fieldValues: Record<string, string> | null =
    record.fieldValues && typeof record.fieldValues === "object" && !Array.isArray(record.fieldValues)
      ? (Object.fromEntries(
          Object.entries(record.fieldValues as Record<string, unknown>)
            .map(([fieldKey, fieldValue]) => [fieldKey, toText(fieldValue)])
            .filter(([, fieldValue]) => fieldValue.length > 0)
        ) as Record<string, string>)
      : null;
  const fieldTokens = fieldValues ? Object.values(fieldValues) : [];
  const fieldText = fieldTokens.join(", ");

  return {
    answerText: answerText ?? (fieldText || null),
    answerValue: answerValue ?? answerText ?? (fieldText || null),
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : answerValue
        ? [answerValue]
        : answerText
        ? [answerText]
        : fieldTokens,
    submittedScore,
    variantId,
    fieldValues,
  };
}

export function resolveSeedAnswerScore(
  question:
    | {
        type: "text" | "single" | "multi" | "number" | "group";
        options?: Array<{ value: string; label: string; score?: number }>;
      }
    | undefined,
  normalized: ReturnType<typeof normalizeSeedAnswerValue>
) {
  if (!question) return null;
  if (question.type === "text" || question.type === "number" || question.type === "group") {
    return null;
  }
  if (typeof normalized.submittedScore === "number") {
    return normalized.submittedScore;
  }
  if (!question.options || question.options.length === 0) return null;

  const candidates = [
    ...normalized.selectedValues,
    normalized.answerValue ?? "",
    normalized.answerText ?? "",
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (candidates.length === 0) return null;

  const scores = candidates
    .map((candidate) => optionScoreByValue(question, candidate))
    .filter((score): score is number => typeof score === "number");
  if (scores.length === 0) return null;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(4));
}
