import {
  NormalizedScore,
  SnapshotOption,
  SnapshotQuestion,
} from "@/lib/server/result-normalizer.types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeQuestionList(
  source: unknown,
  includeIndex = false
): SnapshotQuestion[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((question, idx) =>
      normalizeSnapshotQuestion(question, includeIndex ? idx : undefined)
    )
    .filter((question): question is SnapshotQuestion => !!question);
}

export function normalizeOptionList(source: unknown): SnapshotOption[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((option) => normalizeOption(option))
    .filter((option): option is SnapshotOption => !!option);
}

export function normalizeScoreList(source: unknown): NormalizedScore[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((score) => normalizeScore(score))
    .filter((score): score is NormalizedScore => !!score);
}

export function resolveTopLabels(
  source: unknown,
  fallbackScores: NormalizedScore[]
): string[] {
  const labels = readStringArray(source);
  return labels.length > 0 ? labels : fallbackScores.map((score) => score.label);
}

export function serializeQuestionSnapshotItems(
  questions: SnapshotQuestion[]
): SnapshotQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    text: question.text,
    ...(question.type ? { type: question.type } : {}),
    ...(question.options ? { options: question.options } : {}),
    ...(typeof question.min === "number" ? { min: question.min } : {}),
    ...(typeof question.max === "number" ? { max: question.max } : {}),
  }));
}

export function normalizeSnapshotQuestion(
  question: unknown,
  idx?: number
): SnapshotQuestion | null {
  if (typeof question === "string") {
    return {
      id: typeof idx === "number" ? `Q${idx + 1}` : question,
      text: question,
    };
  }
  if (!isRecord(question)) return null;
  const id =
    typeof question.id === "string"
      ? question.id
      : typeof idx === "number"
      ? `Q${idx + 1}`
      : "";
  const text = typeof question.text === "string" ? question.text : "";
  if (!id || !text) return null;
  return {
    id,
    text,
    type: typeof question.type === "string" ? question.type : undefined,
    options: Array.isArray(question.options)
      ? question.options
          .map((opt) => normalizeOption(opt))
          .filter((opt): opt is SnapshotOption => !!opt)
      : undefined,
    min: asNumber(question.min),
    max: asNumber(question.max),
  };
}

export function normalizeOption(option: unknown): SnapshotOption | null {
  if (!isRecord(option)) return null;
  const label = typeof option.label === "string" ? option.label : null;
  if (!label || !Object.prototype.hasOwnProperty.call(option, "value")) {
    return null;
  }
  return { value: option.value, label };
}

export function normalizeScore(score: unknown): NormalizedScore | null {
  if (!isRecord(score)) return null;
  const label = typeof score.label === "string" ? score.label : null;
  if (!label) return null;
  const code = typeof score.code === "string" ? score.code : undefined;
  const value = asNumber(score.prob ?? score.value ?? score.percent) ?? 0;
  if (code) {
    return { code, label, value };
  }
  return { label, value };
}
