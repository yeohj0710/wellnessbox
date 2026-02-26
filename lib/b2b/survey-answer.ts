export type SurveyQuestionOption = {
  value: string;
  label: string;
  score?: number;
};

export type SurveyQuestionDefinition = {
  type: "text" | "single" | "multi" | "number" | "group";
  options?: SurveyQuestionOption[];
  variants?: Record<
    string,
    {
      variantId?: string;
      options?: SurveyQuestionOption[];
    }
  >;
};

export type NormalizedSurveyAnswer = {
  answerText: string | null;
  answerValue: string | null;
  selectedValues: string[];
  submittedScore: number | null;
  variantId: string | null;
  fieldValues: Record<string, string> | null;
};

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function clampScore01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

export function normalizeSurveyAnswerValue(raw: unknown): NormalizedSurveyAnswer {
  if (raw == null) {
    return {
      answerText: null,
      answerValue: null,
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
  if (typeof raw === "string") {
    const text = raw.trim();
    return {
      answerText: text.length > 0 ? text : null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    const text = String(raw);
    return {
      answerText: text,
      answerValue: text,
      selectedValues: [text],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const text =
      typeof record.answerText === "string"
        ? record.answerText
        : typeof record.text === "string"
          ? record.text
          : null;
    const value =
      typeof record.answerValue === "string"
        ? record.answerValue
        : typeof record.value === "string"
          ? record.value
          : null;
    const values = Array.isArray(record.values)
      ? record.values.map((item) => toText(item)).filter(Boolean)
      : [];
    const selectedValues = Array.isArray(record.selectedValues)
      ? record.selectedValues.map((item) => toText(item)).filter(Boolean)
      : [];
    const fieldValues: Record<string, string> | null =
      record.fieldValues &&
      typeof record.fieldValues === "object" &&
      !Array.isArray(record.fieldValues)
        ? (Object.fromEntries(
            Object.entries(record.fieldValues as Record<string, unknown>)
              .map(([fieldKey, fieldValue]) => [fieldKey, toText(fieldValue)])
              .filter(([, fieldValue]) => fieldValue.length > 0)
          ) as Record<string, string>)
        : null;
    const fieldTokens = fieldValues ? Object.values(fieldValues) : [];
    const fieldText = fieldTokens.join(", ");
    const normalizedText = text && text.trim().length > 0 ? text.trim() : null;
    const normalizedValue = value && value.trim().length > 0 ? value.trim() : null;
    const submittedScore =
      typeof record.score === "number" && Number.isFinite(record.score)
        ? clampScore01(record.score)
        : null;
    const variantId = toText(record.variantId) || null;
    return {
      answerText: normalizedText ?? (fieldText || null),
      answerValue: normalizedValue ?? normalizedText ?? (fieldText || null),
      selectedValues:
        selectedValues.length > 0
          ? selectedValues
          : values.length > 0
            ? values
            : normalizedValue
              ? [normalizedValue]
              : fieldTokens.length > 0
                ? fieldTokens
                : [],
      submittedScore,
      variantId,
      fieldValues,
    };
  }
  return {
    answerText: null,
    answerValue: null,
    selectedValues: [],
    submittedScore: null,
    variantId: null,
    fieldValues: null,
  };
}

export function resolveSurveyQuestionScore(
  question: SurveyQuestionDefinition,
  normalizedAnswer: NormalizedSurveyAnswer
) {
  if (
    question.type === "text" ||
    question.type === "number" ||
    question.type === "group"
  ) {
    return null;
  }

  if (typeof normalizedAnswer.submittedScore === "number") {
    return normalizedAnswer.submittedScore;
  }

  if (!question.options || question.options.length === 0) return null;

  const variantOptions =
    normalizedAnswer.variantId &&
    question.variants &&
    question.variants[normalizedAnswer.variantId]?.options
      ? question.variants[normalizedAnswer.variantId]?.options
      : null;

  const optionMap = new Map<string, number>();
  const sourceOptions =
    variantOptions && variantOptions.length > 0 ? variantOptions : question.options;

  for (const option of sourceOptions) {
    if (typeof option.score !== "number" || !Number.isFinite(option.score)) continue;
    optionMap.set(option.value.toLowerCase(), option.score);
    optionMap.set(option.label.toLowerCase(), option.score);
  }

  const candidates = [
    ...normalizedAnswer.selectedValues,
    normalizedAnswer.answerValue || "",
    normalizedAnswer.answerText || "",
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const matchedScores = candidates
    .map((candidate) => optionMap.get(candidate))
    .filter((score): score is number => typeof score === "number");

  if (matchedScores.length === 0 && variantOptions && variantOptions !== question.options) {
    for (const option of question.options) {
      if (typeof option.score !== "number" || !Number.isFinite(option.score)) continue;
      optionMap.set(option.value.toLowerCase(), option.score);
      optionMap.set(option.label.toLowerCase(), option.score);
    }
    const fallbackMatched = candidates
      .map((candidate) => optionMap.get(candidate))
      .filter((score): score is number => typeof score === "number");
    if (fallbackMatched.length === 0) return null;
    const fallbackAvg =
      fallbackMatched.reduce((sum, score) => sum + score, 0) / fallbackMatched.length;
    return Number(fallbackAvg.toFixed(4));
  }

  if (matchedScores.length === 0) return null;
  const avg = matchedScores.reduce((sum, score) => sum + score, 0) / matchedScores.length;
  return Number(avg.toFixed(4));
}
