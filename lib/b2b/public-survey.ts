import type {
  WellnessAnalysisAnswerRow,
  WellnessAnalysisInput,
} from "@/lib/wellness/analysis-answer-maps";
import {
  buildGroupAnswerValue,
  isSurveyQuestionAnswered,
  resolveGroupFieldValues,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiOtherTextByValue,
  toMultiValues,
  toggleSurveyMultiValue,
  updateSurveyMultiOtherText,
  validateSurveyQuestionAnswer,
} from "@/lib/b2b/public-survey-answer-utils";
import { resolveSelectedSectionsByC27Policy } from "@/lib/b2b/survey-section-resolver";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";

export {
  buildGroupAnswerValue,
  isSurveyQuestionAnswered,
  resolveGroupFieldValues,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiOtherTextByValue,
  toMultiValues,
  toggleSurveyMultiValue,
  updateSurveyMultiOtherText,
  validateSurveyQuestionAnswer,
};

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
  const hasExplicitC27Answer = Object.prototype.hasOwnProperty.call(answers, c27Key);
  const allowedSectionKeys = template.sectionCatalog.map((section) => section.key);
  const allowedSectionKeySet = new Set(allowedSectionKeys);
  const c27Question = c27 ?? null;
  const canUseExplicitC27Answer = Boolean(c27Question) && hasExplicitC27Answer;

  if (!canUseExplicitC27Answer) {
    return resolveSelectedSectionsByC27Policy({
      hasExplicitC27Answer: false,
      selectedSections,
      derivedSections: [],
      allowedSectionKeys,
      maxSelectedSections,
    });
  }
  const c27Resolved = c27Question as WellnessSurveyQuestionForTemplate;

  const resolved: string[] = [];
  const rawTokens = collectRawTokens(answers[c27Key])
    .map((value) => value.trim())
    .filter(Boolean);

  for (const token of rawTokens) {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) continue;

    let matchedSectionKey: string | null = null;
    for (const section of template.sectionCatalog) {
      const keywords = sectionKeywords(template, c27Resolved, section.key);
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
    if (!allowedSectionKeySet.has(matchedSectionKey)) continue;
    if (resolved.includes(matchedSectionKey)) continue;
    resolved.push(matchedSectionKey);
    if (resolved.length >= maxSelectedSections) break;
  }

  return resolveSelectedSectionsByC27Policy({
    hasExplicitC27Answer: true,
    selectedSections,
    derivedSections: resolved,
    allowedSectionKeys,
    maxSelectedSections,
  });
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

export function resolveSurveySelectionState(input: {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSections?: string[];
}) {
  const selectedSections = resolveSelectedSectionsFromC27(
    input.template,
    input.answers,
    input.selectedSections
  );
  const answers = pruneSurveyAnswersByVisibility(
    input.template,
    input.answers,
    selectedSections
  );
  return {
    selectedSections,
    answers,
  };
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
