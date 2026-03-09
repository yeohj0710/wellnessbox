import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";

const TOKEN_SPLIT_REGEX = /[,\n/|]/g;

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

export function toAnswerRecord(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function toInputValue(raw: unknown) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.map((item) => String(item)).filter(Boolean).join(", ");
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (typeof record.answerValue === "string") return record.answerValue;
    if (typeof record.value === "string") return record.value;
    if (typeof record.answerText === "string") return record.answerText;
    if (typeof record.text === "string") return record.text;
    if (Array.isArray(record.selectedValues)) {
      return record.selectedValues.map((item) => String(item)).filter(Boolean).join(", ");
    }
    if (Array.isArray(record.values)) {
      return record.values.map((item) => String(item)).filter(Boolean).join(", ");
    }
    if (record.fieldValues && typeof record.fieldValues === "object") {
      const fieldValues = record.fieldValues as Record<string, unknown>;
      const values = Object.values(fieldValues)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      if (values.length > 0) return values.join(", ");
    }
  }
  return "";
}

export function toMultiValues(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(TOKEN_SPLIT_REGEX)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof raw === "object" && raw) {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.selectedValues)) {
      return record.selectedValues.map((item) => String(item).trim()).filter(Boolean);
    }
    if (Array.isArray(record.values)) {
      return record.values.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof record.answerValue === "string") {
      return record.answerValue
        .split(TOKEN_SPLIT_REGEX)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof record.answerText === "string") {
      return record.answerText
        .split(TOKEN_SPLIT_REGEX)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function toMultiOtherTextByValue(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const source = record.otherTextByValue;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>)
      .map(([value, text]) => [String(value).trim(), String(text ?? "").trim()] as const)
      .filter(([value, text]) => value.length > 0 && text.length > 0)
  );
}

function buildSurveyMultiAnswerValue(values: string[], otherTextByValue: Record<string, string>) {
  if (Object.keys(otherTextByValue).length === 0) return values;
  return {
    values,
    otherTextByValue,
  };
}

function sanitizeMultiOtherTextByValue(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown,
  selectedValues: string[]
) {
  const selectedValueSet = new Set(selectedValues);
  const customInputValueSet = new Set(
    (question.options ?? [])
      .filter((option) => option.allowsCustomInput)
      .map((option) => option.value)
  );
  const source = toMultiOtherTextByValue(rawValue);
  const sanitized: Record<string, string> = {};

  for (const [value, text] of Object.entries(source)) {
    if (!selectedValueSet.has(value)) continue;
    if (!customInputValueSet.has(value)) continue;
    if (!text) continue;
    sanitized[value] = text;
  }

  return sanitized;
}

function optionMatchesToken(
  option: {
    value: string;
    label: string;
    aliases?: string[];
  },
  token: string
) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return false;
  const keys = [option.value, option.label, ...(option.aliases ?? [])]
    .map((value) => normalizeToken(value))
    .filter(Boolean);
  return keys.some((key) => {
    if (normalizedToken === key) return true;
    if (normalizedToken.length < 2 || key.length < 2) return false;
    return normalizedToken.includes(key) || key.includes(normalizedToken);
  });
}

function resolveOptionValueByToken(
  question: WellnessSurveyQuestionForTemplate,
  token: string
) {
  const options = question.options ?? [];
  const matched = options.find((option) =>
    optionMatchesToken(
      {
        value: option.value,
        label: option.label,
        aliases: option.aliases,
      },
      token
    )
  );
  return matched?.value ?? null;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function isSurveyQuestionAnswered(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown
) {
  if (question.type === "multi") {
    return toMultiValues(rawValue).length > 0;
  }
  if (question.type === "group") {
    const fieldValues = resolveGroupFieldValues(question, rawValue);
    return Object.values(fieldValues).some((value) => value.trim().length > 0);
  }
  return toInputValue(rawValue).trim().length > 0;
}

export function resolveGroupFieldValues(
  question: WellnessSurveyQuestionForTemplate | null | undefined,
  rawValue: unknown
) {
  const record = toAnswerRecord(rawValue);
  const sourceValues =
    record && record.fieldValues && typeof record.fieldValues === "object"
      ? (record.fieldValues as Record<string, unknown>)
      : null;
  const fields = question?.fields ?? [];

  if (fields.length === 0) {
    return Object.fromEntries(
      Object.entries(sourceValues ?? {}).map(([fieldId, value]) => [
        fieldId,
        String(value ?? "").trim(),
      ])
    ) as Record<string, string>;
  }

  return Object.fromEntries(
    fields.map((field) => {
      const raw = sourceValues?.[field.id] ?? record?.[field.id] ?? "";
      return [field.id, String(raw ?? "").trim()];
    })
  ) as Record<string, string>;
}

export function buildGroupAnswerValue(
  question: WellnessSurveyQuestionForTemplate,
  fieldValues: Record<string, string>
) {
  const selectedValues = Object.values(fieldValues)
    .map((value) => value.trim())
    .filter(Boolean);
  const answerText = (question.fields ?? [])
    .map((field) => {
      const value = fieldValues[field.id]?.trim() ?? "";
      if (!value) return null;
      return `${field.label} ${value}${field.unit ? ` ${field.unit}` : ""}`.trim();
    })
    .filter((line): line is string => Boolean(line))
    .join(", ");

  return {
    fieldValues,
    answerValue: answerText || undefined,
    answerText: answerText || undefined,
    selectedValues,
  };
}

export function sanitizeSurveyAnswerValue(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown,
  maxSelectedSections: number
): unknown {
  if (question.type === "multi") {
    const mappedValues = unique(
      toMultiValues(rawValue)
        .map((token) => resolveOptionValueByToken(question, token) ?? "")
        .filter(Boolean)
    );
    const maxSelect =
      question.maxSelect ||
      question.constraints?.maxSelections ||
      Math.max(1, maxSelectedSections);
    const noneOptionValue =
      question.noneOptionValue ??
      (question.options ?? []).find((option) => option.isNoneOption)?.value ??
      null;

    const selectedValues = (noneOptionValue && mappedValues.includes(noneOptionValue)
      ? [noneOptionValue]
      : mappedValues
          .filter((value) => !noneOptionValue || value !== noneOptionValue)
          .slice(0, maxSelect)) as string[];
    const otherTextByValue = sanitizeMultiOtherTextByValue(
      question,
      rawValue,
      selectedValues
    );

    return buildSurveyMultiAnswerValue(selectedValues, otherTextByValue);
  }

  if (question.type === "single") {
    const scalarToken = toInputValue(rawValue).trim();
    if (!scalarToken) return "";
    return resolveOptionValueByToken(question, scalarToken) ?? "";
  }

  if (question.type === "group") {
    const fieldValues = resolveGroupFieldValues(question, rawValue);
    return buildGroupAnswerValue(question, fieldValues);
  }

  if (question.type === "number") {
    return toInputValue(rawValue).trim();
  }

  return toInputValue(rawValue).trim();
}

export function toggleSurveyMultiValue(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown,
  targetValue: string,
  maxSelectedSections: number
) {
  const currentAnswer = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
  const currentValues = toMultiValues(currentAnswer);
  const currentOtherTextByValue = { ...toMultiOtherTextByValue(currentAnswer) };
  const current = new Set(currentValues);
  const maxSelect =
    question.maxSelect ||
    question.constraints?.maxSelections ||
    Math.max(1, maxSelectedSections);
  const noneOptionValue =
    question.noneOptionValue ??
    (question.options ?? []).find((option) => option.isNoneOption)?.value ??
    null;

  if (current.has(targetValue)) {
    current.delete(targetValue);
    delete currentOtherTextByValue[targetValue];
  } else if (noneOptionValue && targetValue === noneOptionValue) {
    current.clear();
    current.add(targetValue);
    Object.keys(currentOtherTextByValue).forEach((value) => {
      delete currentOtherTextByValue[value];
    });
  } else {
    if (noneOptionValue) current.delete(noneOptionValue);
    if (current.size < maxSelect) {
      current.add(targetValue);
    }
  }

  return sanitizeSurveyAnswerValue(
    question,
    buildSurveyMultiAnswerValue([...current], currentOtherTextByValue),
    maxSelectedSections
  );
}

export function updateSurveyMultiOtherText(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown,
  targetValue: string,
  text: string,
  maxSelectedSections: number
) {
  const currentAnswer = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
  const currentValues = toMultiValues(currentAnswer);
  if (!currentValues.includes(targetValue)) return currentAnswer;

  const currentOtherTextByValue = { ...toMultiOtherTextByValue(currentAnswer) };
  const nextText = String(text ?? "").trim();
  if (nextText) {
    currentOtherTextByValue[targetValue] = nextText;
  } else {
    delete currentOtherTextByValue[targetValue];
  }

  return sanitizeSurveyAnswerValue(
    question,
    buildSurveyMultiAnswerValue(currentValues, currentOtherTextByValue),
    maxSelectedSections
  );
}

function parseNumber(rawValue: string) {
  if (!rawValue.trim()) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function validateNumberInRange(input: {
  label: string;
  value: string;
  constraints?: {
    min?: number;
    max?: number;
    integer?: boolean;
  };
}) {
  const parsed = parseNumber(input.value);
  if (parsed == null) return `${input.label}은(는) 숫자로 입력해 주세요.`;
  if (input.constraints?.integer && !Number.isInteger(parsed)) {
    return `${input.label}은(는) 정수로 입력해 주세요.`;
  }
  if (typeof input.constraints?.min === "number" && parsed < input.constraints.min) {
    return `${input.label}은(는) ${input.constraints.min} 이상이어야 합니다.`;
  }
  if (typeof input.constraints?.max === "number" && parsed > input.constraints.max) {
    return `${input.label}은(는) ${input.constraints.max} 이하여야 합니다.`;
  }
  return null;
}

export function validateSurveyQuestionAnswer(
  question: WellnessSurveyQuestionForTemplate,
  rawValue: unknown,
  options?: {
    treatSelectionAsOptional?: boolean;
  }
) {
  const required =
    question.required === true &&
    !(
      options?.treatSelectionAsOptional &&
      (question.type === "single" || question.type === "multi")
    );
  const answered = isSurveyQuestionAnswered(question, rawValue);
  if (!answered) {
    return required ? "필수 문항입니다. 응답을 입력해 주세요." : null;
  }

  if (question.type === "single") {
    const value = toInputValue(rawValue).trim();
    const valid = (question.options ?? []).some((option) => option.value === value);
    if (!valid) return "보기 중 하나를 선택해 주세요.";
    return null;
  }

  if (question.type === "multi") {
    const values = toMultiValues(rawValue);
    const optionValues = new Set((question.options ?? []).map((option) => option.value));
    const invalid = values.find((value) => !optionValues.has(value));
    if (invalid) return "유효하지 않은 선택 값이 포함되어 있습니다.";
    const maxSelect =
      question.maxSelect ||
      question.constraints?.maxSelections ||
      optionValues.size ||
      1;
    if (values.length > maxSelect) {
      return `최대 ${maxSelect}개까지만 선택할 수 있습니다.`;
    }
    const noneOptionValue =
      question.noneOptionValue ??
      (question.options ?? []).find((option) => option.isNoneOption)?.value ??
      null;
    if (noneOptionValue && values.includes(noneOptionValue) && values.length > 1) {
      return "없음 항목은 다른 항목과 함께 선택할 수 없습니다.";
    }
    const otherTextByValue = toMultiOtherTextByValue(rawValue);
    for (const value of values) {
      const option = (question.options ?? []).find((item) => item.value === value);
      if (!option?.allowsCustomInput) continue;
      if (!otherTextByValue[value]?.trim()) {
        return "기타 항목 내용을 입력해 주세요.";
      }
    }
    return null;
  }

  if (question.type === "number") {
    const value = toInputValue(rawValue).trim();
    if (!value) return required ? "숫자 값을 입력해 주세요." : null;
    return validateNumberInRange({
      label: "입력값",
      value,
      constraints: question.constraints,
    });
  }

  if (question.type === "group") {
    const fieldValues = resolveGroupFieldValues(question, rawValue);
    for (const field of question.fields ?? []) {
      const value = fieldValues[field.id]?.trim() ?? "";
      if (required && !value) {
        return `${field.label} 값을 입력해 주세요.`;
      }
      if (!value) continue;
      if (field.type === "number") {
        const numberError = validateNumberInRange({
          label: field.label,
          value,
          constraints: field.constraints,
        });
        if (numberError) return numberError;
      }
    }
    return null;
  }

  if (!toInputValue(rawValue).trim()) {
    return required ? "응답을 입력해 주세요." : null;
  }
  return null;
}
