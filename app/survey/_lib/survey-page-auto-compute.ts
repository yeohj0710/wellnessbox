import {
  isSurveyQuestionAnswered,
  resolveGroupFieldValues,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiValues,
  type PublicSurveyAnswers,
  type PublicSurveyQuestionNode,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function toIdentityPayload(identity: IdentityInput): IdentityInput {
  return {
    name: identity.name.trim(),
    birthDate: normalizeDigits(identity.birthDate),
    phone: normalizeDigits(identity.phone),
  };
}

export function isValidIdentityInput(identity: IdentityInput) {
  const normalized = toIdentityPayload(identity);
  return (
    normalized.name.length > 0 &&
    /^\d{8}$/.test(normalized.birthDate) &&
    /^\d{10,11}$/.test(normalized.phone)
  );
}

type SurveyOptionLike = { value?: string | null; label?: string | null };

const BMI_SOURCE_GROUP_KEY = "C03";
const DUPLICATE_SOURCE_COMMON_KEYS = {
  gender: "C01",
  age: "C02",
  femaleStatus: "C04",
  caffeine: "C18",
  alcoholFrequency: "C19",
  alcoholAmount: "C20",
  smoking: "C21",
  sleepDuration: "C23",
  sleepQuality: "C24",
  stress: "C26",
} as const;

const EXPLICIT_DUPLICATE_SOURCE_BY_QUESTION_KEY: Record<string, string> = {
  S02_Q01: DUPLICATE_SOURCE_COMMON_KEYS.caffeine,
  S02_Q02: DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration,
  S10_Q07: DUPLICATE_SOURCE_COMMON_KEYS.sleepQuality,
  S10_Q08: DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration,
  S19_Q09: DUPLICATE_SOURCE_COMMON_KEYS.femaleStatus,
  S23_Q01: DUPLICATE_SOURCE_COMMON_KEYS.gender,
};

type AutoSurveyResolution = {
  answers: PublicSurveyAnswers;
  hiddenQuestionKeys: Set<string>;
};

function normalizeMatchText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeQuestionTextForMatching(question: WellnessSurveyQuestionForTemplate) {
  return normalizeMatchText(`${question.text ?? ""} ${question.helpText ?? ""}`);
}

function optionMatchTokens(option: WellnessSurveyQuestionForTemplate["options"][number]) {
  return [option.value, option.label, ...(option.aliases ?? [])]
    .map((value) => normalizeMatchText(String(value ?? "")))
    .filter(Boolean);
}

function hasTokenMatch(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return false;
  return a.includes(b) || b.includes(a);
}

function resolveOptionValueByTokens(
  question: WellnessSurveyQuestionForTemplate,
  tokens: string[]
): string | null {
  if (!tokens.length) return null;
  const normalizedTokens = tokens.map(normalizeMatchText).filter(Boolean);
  if (normalizedTokens.length === 0) return null;
  for (const option of question.options ?? []) {
    const keys = optionMatchTokens(option);
    if (keys.some((key) => normalizedTokens.some((token) => hasTokenMatch(token, key)))) {
      return option.value;
    }
  }
  return null;
}

function collectAnswerTokensForMapping(
  sourceQuestion: WellnessSurveyQuestionForTemplate,
  sourceRawValue: unknown
) {
  const tokens = new Set<string>();
  const addToken = (value: unknown) => {
    const normalized = normalizeMatchText(String(value ?? ""));
    if (normalized) tokens.add(normalized);
  };

  addToken(toInputValue(sourceRawValue));
  for (const value of toMultiValues(sourceRawValue)) {
    addToken(value);
  }

  const record = toAnswerRecord(sourceRawValue);
  if (record) {
    if (typeof record.answerValue === "string") addToken(record.answerValue);
    if (typeof record.answerText === "string") addToken(record.answerText);
  }

  const selectedValues = toMultiValues(sourceRawValue);
  const scalar = toInputValue(sourceRawValue).trim();
  if (scalar && selectedValues.length === 0) selectedValues.push(scalar);
  for (const selected of selectedValues) {
    const option = (sourceQuestion.options ?? []).find((item) => item.value === selected);
    if (!option) continue;
    addToken(option.value);
    addToken(option.label);
    for (const alias of option.aliases ?? []) addToken(alias);
  }

  return [...tokens];
}

function resolveAgeThresholdFromQuestion(question: WellnessSurveyQuestionForTemplate): number | null {
  const source = `${question.text ?? ""} ${question.helpText ?? ""}`;
  const matched = source.match(/만\s*(\d{1,3})\s*세\s*이상/i);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveBinaryOptionValues(question: WellnessSurveyQuestionForTemplate) {
  const options = question.options ?? [];
  if (options.length === 0) {
    return { yesValue: null as string | null, noValue: null as string | null };
  }
  const yesKeywords = ["예", "네", "있", "해당", "맞", "yes", "true"];
  const noKeywords = ["아니", "없", "해당없", "no", "false"];
  const findByKeywords = (keywords: string[]) =>
    options.find((option) => {
      const source = normalizeMatchText(
        [option.value, option.label, ...(option.aliases ?? [])].join(" ")
      );
      return keywords.some((keyword) => source.includes(normalizeMatchText(keyword)));
    })?.value ?? null;

  const yesValue = findByKeywords(yesKeywords) ?? options[0]?.value ?? null;
  const fallbackNo = options.find((option) => option.value !== yesValue)?.value ?? null;
  const noValue = findByKeywords(noKeywords) ?? fallbackNo;
  return { yesValue, noValue };
}

function resolveDuplicateCommonSourceKey(node: PublicSurveyQuestionNode): string | null {
  if (!node.sectionKey) return null;
  const explicit = EXPLICIT_DUPLICATE_SOURCE_BY_QUESTION_KEY[node.question.key];
  if (explicit) return explicit;

  const text = normalizeQuestionTextForMatching(node.question);
  if (!text) return null;

  if (text.includes("흡연") || text.includes("전자담배") || text.includes("담배")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.smoking;
  }
  if (text.includes("스트레스")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.stress;
  }
  if (text.includes("성별")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.gender;
  }
  if (text.includes("카페인") || text.includes("커피")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.caffeine;
  }
  if (text.includes("음주") || text.includes("술")) {
    if (text.includes("음주량") || text.includes("1회") || text.includes("한번") || text.includes("몇잔")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.alcoholAmount;
    }
    if (text.includes("빈도") || text.includes("횟수") || text.includes("자주")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.alcoholFrequency;
    }
  }
  if (text.includes("수면") || text.includes("잠")) {
    if (text.includes("질") || text.includes("숙면") || text.includes("개운")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.sleepQuality;
    }
    if (text.includes("시간") || text.includes("68")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration;
    }
  }
  if (resolveAgeThresholdFromQuestion(node.question) != null) {
    return DUPLICATE_SOURCE_COMMON_KEYS.age;
  }
  return null;
}

function isSameAnswerValue(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function mapSourceAnswerToTargetQuestion(input: {
  sourceQuestion: WellnessSurveyQuestionForTemplate;
  sourceRawValue: unknown;
  targetQuestion: WellnessSurveyQuestionForTemplate;
  maxSelectedSections: number;
}): unknown | null {
  const { sourceQuestion, sourceRawValue, targetQuestion, maxSelectedSections } = input;
  if (!isSurveyQuestionAnswered(sourceQuestion, sourceRawValue)) return null;

  if (targetQuestion.type === "single") {
    const tokens = collectAnswerTokensForMapping(sourceQuestion, sourceRawValue);
    const matchedValue = resolveOptionValueByTokens(targetQuestion, tokens);
    if (!matchedValue) return null;
    const sanitized = sanitizeSurveyAnswerValue(targetQuestion, matchedValue, maxSelectedSections);
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  if (targetQuestion.type === "multi") {
    const tokens = collectAnswerTokensForMapping(sourceQuestion, sourceRawValue);
    const selectedValues = Array.from(
      new Set(
        tokens
          .map((token) => resolveOptionValueByTokens(targetQuestion, [token]))
          .filter((value): value is string => Boolean(value))
      )
    );
    if (selectedValues.length === 0) return null;
    const sanitized = sanitizeSurveyAnswerValue(
      targetQuestion,
      selectedValues,
      maxSelectedSections
    );
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  if (targetQuestion.type === "number" || targetQuestion.type === "text") {
    const scalar = toInputValue(sourceRawValue).trim();
    if (!scalar) return null;
    const sanitized = sanitizeSurveyAnswerValue(targetQuestion, scalar, maxSelectedSections);
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  return null;
}

function toPositiveNumber(raw: string | undefined): number | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function resolveAgeDerivedAnswerForQuestion(input: {
  sourceRawValue: unknown;
  targetQuestion: WellnessSurveyQuestionForTemplate;
  maxSelectedSections: number;
}): unknown | null {
  const { sourceRawValue, targetQuestion, maxSelectedSections } = input;
  if (targetQuestion.type !== "single") return null;
  const threshold = resolveAgeThresholdFromQuestion(targetQuestion);
  if (threshold == null) return null;
  const age = toPositiveNumber(toInputValue(sourceRawValue));
  if (age == null) return null;
  const { yesValue, noValue } = resolveBinaryOptionValues(targetQuestion);
  const targetValue = age >= threshold ? yesValue : noValue;
  if (!targetValue) return null;
  const sanitized = sanitizeSurveyAnswerValue(targetQuestion, targetValue, maxSelectedSections);
  return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
}

function resolveAutoDuplicateSurveyState(input: {
  answers: PublicSurveyAnswers;
  questionList: PublicSurveyQuestionNode[];
  maxSelectedSections: number;
}): AutoSurveyResolution {
  const questionMap = new Map(input.questionList.map((node) => [node.question.key, node.question]));
  const hiddenQuestionKeys = new Set<string>();
  let nextAnswers = input.answers;

  for (const node of input.questionList) {
    if (!node.sectionKey) continue;
    const sourceCommonKey = resolveDuplicateCommonSourceKey(node);
    if (!sourceCommonKey) continue;

    const sourceQuestion = questionMap.get(sourceCommonKey);
    if (!sourceQuestion) continue;
    const sourceRawValue = input.answers[sourceCommonKey];
    if (!isSurveyQuestionAnswered(sourceQuestion, sourceRawValue)) continue;

    const derivedAnswer =
      sourceCommonKey === DUPLICATE_SOURCE_COMMON_KEYS.age
        ? resolveAgeDerivedAnswerForQuestion({
            sourceRawValue,
            targetQuestion: node.question,
            maxSelectedSections: input.maxSelectedSections,
          })
        : mapSourceAnswerToTargetQuestion({
            sourceQuestion,
            sourceRawValue,
            targetQuestion: node.question,
            maxSelectedSections: input.maxSelectedSections,
          });
    if (derivedAnswer == null) continue;

    hiddenQuestionKeys.add(node.question.key);
    if (isSameAnswerValue(input.answers[node.question.key], derivedAnswer)) continue;
    if (nextAnswers === input.answers) nextAnswers = { ...input.answers };
    nextAnswers[node.question.key] = derivedAnswer;
  }

  return { answers: nextAnswers, hiddenQuestionKeys };
}

function resolveBmiFromAnswers(
  answers: PublicSurveyAnswers,
  questionList: PublicSurveyQuestionNode[]
): number | null {
  const bmiSourceQuestion = questionList.find(
    (node) => node.question.key === BMI_SOURCE_GROUP_KEY && node.question.type === "group"
  )?.question;
  if (!bmiSourceQuestion) return null;

  const fields = resolveGroupFieldValues(bmiSourceQuestion, answers[BMI_SOURCE_GROUP_KEY]);
  const heightCm = toPositiveNumber(fields.heightCm);
  const weightKg = toPositiveNumber(fields.weightKg);
  if (heightCm == null || weightKg == null) return null;
  const heightMeter = heightCm > 3 ? heightCm / 100 : heightCm;
  if (!Number.isFinite(heightMeter) || heightMeter <= 0) return null;
  const bmi = weightKg / (heightMeter * heightMeter);
  return Number.isFinite(bmi) && bmi > 0 ? bmi : null;
}

function isAutoDerivedBmiQuestion(node: PublicSurveyQuestionNode) {
  if (node.question.type !== "single") return false;
  const source = [
    node.question.text ?? "",
    node.question.helpText ?? "",
    ...(node.question.options ?? []).map(
      (option) => `${option.label ?? ""} ${option.value ?? ""}`
    ),
  ]
    .join(" ")
    .toLowerCase();
  return source.includes("bmi") || source.includes("체질량지수");
}

function pickOptionValue(
  options: SurveyOptionLike[],
  code: string,
  fallbackIndex: number
): string | null {
  const codeUpper = code.toUpperCase();
  const byCode = options.find(
    (option) => (option.value ?? "").trim().toUpperCase() === codeUpper
  );
  if (byCode?.value) return byCode.value;
  const fallback = options[Math.max(0, Math.min(fallbackIndex, options.length - 1))];
  return fallback?.value ?? null;
}

function resolveAutoDerivedBmiAnswer(
  options: SurveyOptionLike[],
  bmi: number | null
): string | null {
  if (options.length === 0) return null;
  const high = pickOptionValue(options, "A", 0);
  const normal = pickOptionValue(options, "B", 1);
  const low = pickOptionValue(options, "C", 2);
  const unknown =
    pickOptionValue(options, "D", options.length - 1) ?? low ?? normal ?? high;
  const hasFourChoiceScale = options.some(
    (option) => (option.value ?? "").trim().toUpperCase() === "D"
  );
  if (bmi == null) return unknown;
  if (hasFourChoiceScale) {
    if (bmi >= 25) return high;
    if (bmi > 18.5) return normal ?? high;
    return low ?? normal ?? high;
  }
  if (bmi >= 25) return high;
  return normal ?? high;
}

function mergeAutoDerivedBmiAnswers(
  inputAnswers: PublicSurveyAnswers,
  questionList: PublicSurveyQuestionNode[]
): PublicSurveyAnswers {
  const bmi = resolveBmiFromAnswers(inputAnswers, questionList);
  let nextAnswers = inputAnswers;
  for (const node of questionList) {
    if (!isAutoDerivedBmiQuestion(node)) continue;
    const derivedValue = resolveAutoDerivedBmiAnswer(node.question.options ?? [], bmi);
    if (!derivedValue) continue;
    if (toInputValue(inputAnswers[node.question.key]) === derivedValue) continue;
    if (nextAnswers === inputAnswers) nextAnswers = { ...inputAnswers };
    nextAnswers[node.question.key] = derivedValue;
  }
  return nextAnswers;
}

export function resolveAutoComputedSurveyState(input: {
  answers: PublicSurveyAnswers;
  questionList: PublicSurveyQuestionNode[];
  maxSelectedSections: number;
}): AutoSurveyResolution {
  const duplicateState = resolveAutoDuplicateSurveyState(input);
  const answersWithBmi = mergeAutoDerivedBmiAnswers(
    duplicateState.answers,
    input.questionList
  );
  const hiddenQuestionKeys = new Set(duplicateState.hiddenQuestionKeys);
  for (const node of input.questionList) {
    if (!isAutoDerivedBmiQuestion(node)) continue;
    hiddenQuestionKeys.add(node.question.key);
  }
  return { answers: answersWithBmi, hiddenQuestionKeys };
}

