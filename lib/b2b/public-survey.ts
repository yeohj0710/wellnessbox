import type {
  WellnessAnalysisAnswerRow,
  WellnessAnalysisInput,
} from "@/lib/wellness/analysis-answer-maps";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";

export type PublicSurveyAnswers = Record<string, unknown>;

export type PublicSurveyQuestionNode = {
  question: WellnessSurveyQuestionForTemplate;
  sectionKey: string | null;
  sectionTitle: string;
};

export type PublicSurveyProgress = {
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  percent: number;
};

export type BuildPublicSurveyQuestionListOptions = {
  deriveSelectedSections?: boolean;
};

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

function collectRawTokens(rawValue: unknown) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item));
  }
  if (typeof rawValue === "string") {
    return rawValue.split(TOKEN_SPLIT_REGEX);
  }
  if (typeof rawValue === "object" && rawValue) {
    const record = rawValue as Record<string, unknown>;
    const tokens: string[] = [];
    if (Array.isArray(record.selectedValues)) {
      tokens.push(...record.selectedValues.map((item) => String(item)));
    }
    if (Array.isArray(record.values)) {
      tokens.push(...record.values.map((item) => String(item)));
    }
    if (typeof record.answerValue === "string") {
      tokens.push(...record.answerValue.split(TOKEN_SPLIT_REGEX));
    }
    if (typeof record.answerText === "string") {
      tokens.push(...record.answerText.split(TOKEN_SPLIT_REGEX));
    }
    return tokens;
  }
  return [];
}

function sectionKeywords(
  template: WellnessSurveyTemplate,
  c27: WellnessSurveyQuestionForTemplate,
  sectionKey: string
) {
  const catalog = template.sectionCatalog.find((section) => section.key === sectionKey);
  const option = (c27.options ?? []).find((item) => item.value === sectionKey);

  return [
    sectionKey,
    catalog?.title ?? "",
    catalog?.displayName ?? "",
    catalog?.triggerLabel ?? "",
    ...(catalog?.aliases ?? []),
    option?.value ?? "",
    option?.label ?? "",
    ...(option?.aliases ?? []),
  ]
    .map((value) => normalizeToken(value))
    .filter(Boolean);
}

export function resolveSelectedSectionsFromC27(
  template: WellnessSurveyTemplate,
  answers: PublicSurveyAnswers,
  selectedSections: string[] = []
) {
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const c27 = template.common.find((question) => question.key === c27Key);
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const allowedSectionKeys = new Set(template.sectionCatalog.map((section) => section.key));
  const resolved = new Set<string>();

  for (const sectionKey of selectedSections) {
    if (allowedSectionKeys.has(sectionKey)) resolved.add(sectionKey);
    if (resolved.size >= maxSelectedSections) return [...resolved];
  }

  if (!c27) return [...resolved];
  const rawTokens = collectRawTokens(answers[c27Key])
    .map((value) => value.trim())
    .filter(Boolean);

  for (const token of rawTokens) {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) continue;

    let matchedSectionKey: string | null = null;
    for (const section of template.sectionCatalog) {
      const keywords = sectionKeywords(template, c27, section.key);
      const matched = keywords.some((keyword) => {
        if (normalizedToken === keyword) return true;
        if (normalizedToken.length < 2 || keyword.length < 2) return false;
        return normalizedToken.includes(keyword) || keyword.includes(normalizedToken);
      });
      if (matched) {
        matchedSectionKey = section.key;
        break;
      }
    }

    if (!matchedSectionKey) continue;
    if (!allowedSectionKeys.has(matchedSectionKey)) continue;
    resolved.add(matchedSectionKey);
    if (resolved.size >= maxSelectedSections) break;
  }

  return [...resolved];
}

export function isSurveyQuestionVisible(
  question: WellnessSurveyQuestionForTemplate,
  answers: PublicSurveyAnswers
) {
  if (!question.displayIf?.field || !question.displayIf.equals) return true;
  const target = normalizeToken(question.displayIf.equals);
  if (!target) return true;

  const raw = answers[question.displayIf.field];
  const candidates = new Set<string>();

  const scalar = normalizeToken(toInputValue(raw));
  if (scalar) candidates.add(scalar);
  for (const value of toMultiValues(raw)) {
    const normalized = normalizeToken(value);
    if (normalized) candidates.add(normalized);
  }
  const record = toAnswerRecord(raw);
  if (record) {
    const answerValue =
      typeof record.answerValue === "string" ? normalizeToken(record.answerValue) : "";
    const answerText =
      typeof record.answerText === "string" ? normalizeToken(record.answerText) : "";
    if (answerValue) candidates.add(answerValue);
    if (answerText) candidates.add(answerText);
  }

  return candidates.has(target);
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

export function buildPublicSurveyQuestionList(
  template: WellnessSurveyTemplate,
  answers: PublicSurveyAnswers,
  selectedSectionsInput?: string[],
  options?: BuildPublicSurveyQuestionListOptions
) {
  const selectedSections =
    options?.deriveSelectedSections === false
      ? resolveSelectedSectionsFromC27(template, {}, selectedSectionsInput ?? [])
      : resolveSelectedSectionsFromC27(template, answers, selectedSectionsInput);
  const selectedSectionSet = new Set(selectedSections);
  const sectionByKey = new Map(template.sections.map((section) => [section.key, section]));
  const list: PublicSurveyQuestionNode[] = [];

  for (const question of template.common) {
    if (!isSurveyQuestionVisible(question, answers)) continue;
    list.push({
      question,
      sectionKey: null,
      sectionTitle: "공통 설문",
    });
  }

  for (const catalog of template.sectionCatalog) {
    if (!selectedSectionSet.has(catalog.key)) continue;
    const section = sectionByKey.get(catalog.key);
    if (!section) continue;
    for (const question of section.questions) {
      if (!isSurveyQuestionVisible(question, answers)) continue;
      list.push({
        question,
        sectionKey: catalog.key,
        sectionTitle: catalog.displayName || catalog.title,
      });
    }
  }

  return list;
}

function unique(values: string[]) {
  return [...new Set(values)];
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
  if (
    typeof input.constraints?.min === "number" &&
    parsed < input.constraints.min
  ) {
    return `${input.label}은(는) ${input.constraints.min} 이상이어야 합니다.`;
  }
  if (
    typeof input.constraints?.max === "number" &&
    parsed > input.constraints.max
  ) {
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

export function pruneSurveyAnswersByVisibility(
  template: WellnessSurveyTemplate,
  answers: PublicSurveyAnswers,
  selectedSectionsInput?: string[]
) {
  const selectedSections = resolveSelectedSectionsFromC27(
    template,
    answers,
    selectedSectionsInput
  );
  const visibleQuestionKeys = new Set(
    buildPublicSurveyQuestionList(template, answers, selectedSections).map(
      (item) => item.question.key
    )
  );
  const pruned: PublicSurveyAnswers = {};
  for (const [questionKey, rawValue] of Object.entries(answers)) {
    if (!visibleQuestionKeys.has(questionKey)) continue;
    pruned[questionKey] = rawValue;
  }
  return pruned;
}

export function normalizeSurveyAnswersByTemplate(
  template: WellnessSurveyTemplate,
  rawAnswers: PublicSurveyAnswers
) {
  const questionMap = new Map<string, WellnessSurveyQuestionForTemplate>();
  for (const question of template.common) {
    questionMap.set(question.key, question);
  }
  for (const section of template.sections) {
    for (const question of section.questions) {
      questionMap.set(question.key, question);
    }
  }
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const normalized: PublicSurveyAnswers = {};

  for (const [questionKey, rawValue] of Object.entries(rawAnswers)) {
    const question = questionMap.get(questionKey);
    if (!question) continue;
    normalized[questionKey] = sanitizeSurveyAnswerValue(
      question,
      rawValue,
      maxSelectedSections
    );
  }

  const selectedSections = resolveSelectedSectionsFromC27(template, normalized);
  return pruneSurveyAnswersByVisibility(template, normalized, selectedSections);
}

export function computeSurveyProgress(
  questionList: PublicSurveyQuestionNode[],
  answers: PublicSurveyAnswers
): PublicSurveyProgress {
  const total = questionList.length;
  const requiredQuestions = questionList.filter((item) => item.question.required);
  const answered = questionList.filter((item) =>
    isSurveyQuestionAnswered(item.question, answers[item.question.key])
  ).length;
  const requiredAnswered = requiredQuestions.filter((item) =>
    isSurveyQuestionAnswered(item.question, answers[item.question.key])
  ).length;

  return {
    total,
    answered,
    requiredTotal: requiredQuestions.length,
    requiredAnswered,
    percent: total > 0 ? Math.round((answered / total) * 100) : 0,
  };
}

function toAnalysisAnswerRow(input: {
  question: WellnessSurveyQuestionForTemplate;
  sectionKey: string | null;
  rawValue: unknown;
}): WellnessAnalysisAnswerRow | null {
  const { question, sectionKey, rawValue } = input;
  const record = toAnswerRecord(rawValue);
  const variantId =
    typeof record?.variantId === "string" && record.variantId.trim().length > 0
      ? record.variantId
      : undefined;

  if (question.type === "multi") {
    const selectedValues = toMultiValues(rawValue);
    if (selectedValues.length === 0) return null;
    const otherTextByValue = toMultiOtherTextByValue(rawValue);
    const answerLabels = selectedValues.map((value) => {
      const matched = (question.options ?? []).find((option) => option.value === value);
      if (matched?.allowsCustomInput && otherTextByValue[value]) {
        return `${matched.label}: ${otherTextByValue[value]}`;
      }
      return matched?.label ?? value;
    });
    const hasOtherText = Object.keys(otherTextByValue).length > 0;
    return {
      questionKey: question.key,
      sectionKey,
      answerText: answerLabels.join(", "),
      answerValue: selectedValues[0] ?? null,
      score: null,
      meta: {
        selectedValues,
        ...(hasOtherText ? { otherTextByValue } : {}),
        ...(variantId ? { variantId } : {}),
      },
    };
  }

  if (question.type === "group") {
    const fieldValues = resolveGroupFieldValues(question, rawValue);
    const selectedValues = Object.values(fieldValues)
      .map((value) => value.trim())
      .filter(Boolean);
    if (selectedValues.length === 0) return null;
    const answerValue = toInputValue(rawValue).trim();
    return {
      questionKey: question.key,
      sectionKey,
      answerText: answerValue || selectedValues.join(", "),
      answerValue: answerValue || selectedValues.join(", "),
      score: null,
      meta: {
        selectedValues,
        fieldValues,
        ...(variantId ? { variantId } : {}),
      },
    };
  }

  const scalarValue = toInputValue(rawValue).trim();
  if (!scalarValue) return null;
  const matchedOption = (question.options ?? []).find((option) => option.value === scalarValue);
  const answerText = matchedOption?.label ?? scalarValue;
  return {
    questionKey: question.key,
    sectionKey,
    answerText,
    answerValue: scalarValue,
    score: null,
    meta: {
      selectedValues: [scalarValue],
      ...(variantId ? { variantId } : {}),
    },
  };
}

export function buildWellnessAnalysisInputFromSurvey(input: {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSections?: string[];
}): WellnessAnalysisInput {
  const normalizedAnswers = normalizeSurveyAnswersByTemplate(input.template, input.answers);
  const selectedSections = resolveSelectedSectionsFromC27(
    input.template,
    normalizedAnswers,
    input.selectedSections
  );

  const sectionByQuestionKey = new Map<string, string | null>();
  for (const question of input.template.common) {
    sectionByQuestionKey.set(question.key, null);
  }
  for (const section of input.template.sections) {
    for (const question of section.questions) {
      sectionByQuestionKey.set(question.key, section.key);
    }
  }

  const questionByKey = new Map<string, WellnessSurveyQuestionForTemplate>();
  for (const question of input.template.common) {
    questionByKey.set(question.key, question);
  }
  for (const section of input.template.sections) {
    for (const question of section.questions) {
      questionByKey.set(question.key, question);
    }
  }

  const answers: WellnessAnalysisAnswerRow[] = [];
  for (const [questionKey, rawValue] of Object.entries(normalizedAnswers)) {
    const question = questionByKey.get(questionKey);
    if (!question) continue;
    if (!isSurveyQuestionAnswered(question, rawValue)) continue;
    const sectionKey = sectionByQuestionKey.get(questionKey) ?? null;
    const row = toAnalysisAnswerRow({
      question,
      sectionKey,
      rawValue,
    });
    if (row) answers.push(row);
  }

  return {
    selectedSections,
    answersJson: JSON.parse(JSON.stringify(normalizedAnswers)) as Record<string, unknown>,
    answers,
  };
}
