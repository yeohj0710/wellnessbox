import type {
  WellnessCommonSurvey,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-loader";
import type {
  CommonAnswerMap,
  SectionAnswerMapBySectionId,
  WellnessAnswerValue,
} from "@/lib/wellness/scoring";

export type WellnessAnalysisAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score?: number | null;
  meta?: unknown;
};

export type WellnessAnalysisInput = {
  selectedSections: string[];
  answersJson: Record<string, unknown> | null;
  answers: WellnessAnalysisAnswerRow[];
};

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeSelectedValues(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map((item) => toText(item)).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,\n/|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseAnswerValue(raw: unknown): WellnessAnswerValue {
  if (raw == null) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }
  if (Array.isArray(raw)) {
    const selectedValues = normalizeSelectedValues(raw);
    return {
      answerText: selectedValues.join(", ") || null,
      answerValue: null,
      selectedValues,
    };
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = toText(raw);
    return {
      answerText: text || null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
    };
  }

  const row = asRecord(raw);
  if (!row) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }

  const answerText = toText(row.answerText ?? row.text) || null;
  const answerValue = toText(row.answerValue ?? row.value) || null;
  const selectedValues = normalizeSelectedValues(row.selectedValues ?? row.values);
  const fieldValues = asRecord(row.fieldValues);
  const fieldTokens = fieldValues
    ? Object.values(fieldValues).map((item) => toText(item)).filter(Boolean)
    : [];
  const fieldText = fieldTokens.join(", ");
  const score =
    typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null;
  const variantId = toText(row.variantId) || null;

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
        : fieldTokens.length > 0
        ? fieldTokens
        : [],
    score,
    variantId,
  };
}

function toAnswerValueFromRow(row: WellnessAnalysisAnswerRow): WellnessAnswerValue {
  const meta = asRecord(row.meta);
  const selectedValues = normalizeSelectedValues(meta?.selectedValues);
  const fieldValues = asRecord(meta?.fieldValues);
  const fieldTokens = fieldValues
    ? Object.values(fieldValues).map((item) => toText(item)).filter(Boolean)
    : [];
  const variantId = toText(meta?.variantId) || null;

  return {
    answerText: row.answerText ?? null,
    answerValue: row.answerValue ?? null,
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : row.answerValue
        ? [row.answerValue]
        : row.answerText
        ? [row.answerText]
        : fieldTokens.length > 0
        ? fieldTokens
        : [],
    score: typeof row.score === "number" ? row.score : null,
    variantId,
  };
}

export function buildQuestionAnswerMap(input: WellnessAnalysisInput) {
  const map = new Map<string, WellnessAnswerValue>();

  for (const [questionKey, rawValue] of Object.entries(input.answersJson ?? {})) {
    map.set(questionKey, parseAnswerValue(rawValue));
  }

  for (const row of input.answers) {
    if (!row.questionKey) continue;
    map.set(row.questionKey, toAnswerValueFromRow(row));
  }

  return map;
}

export function deriveSelectedSections(
  selectedSections: string[],
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
) {
  const selected = new Set(selectedSections.filter(Boolean));
  const c27 = commonDef.questions.find((question) => question.id === "C27");
  const c27Answer = questionAnswers.get("C27");
  for (const token of c27Answer?.selectedValues ?? []) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) continue;
    const matched = c27?.options?.find((option) => {
      if (option.value.toLowerCase() === normalized) return true;
      if (option.label.toLowerCase() === normalized) return true;
      return (option.aliases ?? []).some(
        (alias) => alias.trim().toLowerCase() === normalized
      );
    });
    if (matched) selected.add(matched.value);
  }

  const maxSelected = c27?.constraints?.maxSelections ?? 5;
  return [...selected].slice(0, maxSelected);
}

export function buildCommonAnswerMap(
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
): CommonAnswerMap {
  const commonAnswers: CommonAnswerMap = {};
  for (const question of commonDef.questions) {
    commonAnswers[question.id] = questionAnswers.get(question.id) ?? null;
  }
  return commonAnswers;
}

export function buildSectionAnswerMap(
  sectionsDef: WellnessSectionSurvey,
  selectedSections: string[],
  questionAnswers: Map<string, WellnessAnswerValue>
): SectionAnswerMapBySectionId {
  const selectedSet = new Set(selectedSections);
  const answerMap: SectionAnswerMapBySectionId = {};

  for (const section of sectionsDef.sections) {
    if (!selectedSet.has(section.id)) continue;
    answerMap[section.id] = {};
    for (const question of section.questions) {
      answerMap[section.id][question.id] = questionAnswers.get(question.id) ?? null;
    }
  }
  return answerMap;
}
