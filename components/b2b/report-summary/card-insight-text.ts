import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import commonSurveyJson from "@/data/b2b/survey.common.json";
import sectionSurveyJson from "@/data/b2b/survey.sections.json";

export type SurveyAnswerLookup = {
  questionText: string;
  answerText: string;
};

let optionLabelByQuestionKeyCache: Map<string, Map<string, string>> | null = null;

function getOptionLabelByQuestionKey() {
  if (optionLabelByQuestionKeyCache) return optionLabelByQuestionKeyCache;
  const map = new Map<string, Map<string, string>>();

  const pushQuestionOptions = (question: unknown) => {
    const row = question as
      | {
          id?: unknown;
          options?: Array<{ value?: unknown; label?: unknown }>;
        }
      | undefined;
    const questionKey = toTrimmedText(row?.id);
    if (!questionKey) return;
    const optionMap = new Map<string, string>();
    for (const option of row?.options ?? []) {
      const value = toTrimmedText(option.value);
      const label = toTrimmedText(option.label);
      if (!value || !label) continue;
      optionMap.set(value, label);
    }
    if (optionMap.size > 0) {
      map.set(questionKey, optionMap);
    }
  };

  for (const question of commonSurveyJson.questions ?? []) {
    pushQuestionOptions(question);
  }

  for (const section of sectionSurveyJson.sections ?? []) {
    for (const question of section.questions ?? []) {
      pushQuestionOptions(question);
    }
  }

  optionLabelByQuestionKeyCache = map;
  return map;
}

function isCodeLikeAnswerText(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  return /^[A-Z](?:\s*[,/|]\s*[A-Z])*$/i.test(normalized);
}

function stripQuestionAndScoreTokens(text: string) {
  return text
    .replace(/\bS\d{2}_Q\d{2}\b/gi, " ")
    .replace(/\bQ\s*\d+\b/gi, " ")
    .replace(/\b[CS]\d{1,2}\b/gi, " ")
    .replace(/점수\s*\(?\d+\s*점\)?/g, " ")
    .replace(/\(\s*\d+\s*점\s*\)/g, " ")
    .replace(/\[\s*(상세|공통|생활습관|선택 영역)\s*\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function decodeAnswerTextByQuestionKey(questionKey: string, answerText: string) {
  const normalizedQuestionKey = toTrimmedText(questionKey);
  const normalizedAnswerText = toTrimmedText(answerText);
  if (!normalizedQuestionKey || !normalizedAnswerText) return normalizedAnswerText;

  const optionMap = getOptionLabelByQuestionKey().get(normalizedQuestionKey);
  if (!optionMap) return normalizedAnswerText;

  const tokens = normalizedAnswerText
    .split(/[,\n/|]/g)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return normalizedAnswerText;

  const labels = tokens.map((token) => optionMap.get(token) ?? token);
  const decoded = labels.join(", ").trim();
  return decoded || normalizedAnswerText;
}

export function resolvePreferredAnswerText(input: {
  questionKey: string;
  rawAnswerText: unknown;
  surveyAnswerText: string | undefined;
  emptyFallback: string;
}) {
  const raw = decodeAnswerTextByQuestionKey(
    input.questionKey,
    toTrimmedText(input.rawAnswerText)
  );
  const survey = decodeAnswerTextByQuestionKey(
    input.questionKey,
    toTrimmedText(input.surveyAnswerText)
  );
  if (!raw) return survey || input.emptyFallback;
  if (!survey) return raw;
  if (raw === survey) return raw;
  if (isCodeLikeAnswerText(raw) && !isCodeLikeAnswerText(survey)) return survey;
  return raw;
}

export function clampPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function ensureSentence(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
}

export function shortenLine(text: string, maxLength = 110) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function sanitizeTitle(text: string) {
  return stripQuestionAndScoreTokens(text).replace(/^[\-:|/,\s]+|[\-:|/,\s]+$/g, "");
}

export function softenAdviceTone(text: string) {
  let updated = stripQuestionAndScoreTokens(text);
  const replacements: Array<[RegExp, string]> = [
    [/권장합니다/g, "권해드립니다"],
    [/추천합니다/g, "추천드려요"],
    [/필요합니다/g, "챙겨보면 좋습니다"],
    [/바꿔\s*주세요/g, "한 번 바꿔보세요"],
    [/확인해\s*주세요/g, "확인해보세요"],
    [/조정해\s*주세요/g, "조정해보세요"],
    [/관리해\s*주세요/g, "관리해보세요"],
    [/줄이세요/g, "줄여보세요"],
    [/드세요/g, "드셔보세요"],
  ];
  for (const [pattern, replacement] of replacements) {
    updated = updated.replace(pattern, replacement);
  }
  return ensureSentence(updated);
}

export function resolveHealthScoreLabel(value: number | null) {
  if (value == null) return { valueText: "-", unitText: "" };
  return { valueText: String(Math.round(clampPercent(value))), unitText: "점" };
}

export function buildSurveyAnswerLookup(payload: ReportSummaryPayload) {
  const lookup = new Map<string, SurveyAnswerLookup>();
  for (const answer of payload.survey?.answers ?? []) {
    const questionKey = toTrimmedText(answer?.questionKey);
    if (!questionKey) continue;
    const questionText = toTrimmedText(answer?.questionText);
    const answerTextSource =
      toTrimmedText(answer?.answerText) || toTrimmedText(answer?.answerValue);
    const answerText = decodeAnswerTextByQuestionKey(questionKey, answerTextSource);
    lookup.set(questionKey, { questionText, answerText });
  }
  return lookup;
}
