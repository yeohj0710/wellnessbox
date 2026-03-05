import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import commonSurveyJson from "@/data/b2b/survey.common.json";
import sectionSurveyJson from "@/data/b2b/survey.sections.json";
import { ensureArray, firstOrDash, toScoreValue } from "./helpers";

const MAX_ANALYSIS_LINES = 2;
const MAX_RISK_LINES = 3;

type AnalysisCandidate = {
  sectionId: string;
  sectionTitle: string;
  sectionPercent: number;
  questionNumber: number;
  questionKey: string;
  questionScore: number;
  questionText: string;
  answerText: string;
  text: string;
};

type RiskCandidate = {
  category: "detailed" | "common" | "domain" | "section";
  title: string;
  score: number;
  action: string;
  questionKey: string;
  questionNumber: number;
  questionText: string;
  answerText: string;
};

type SurveyAnswerLookup = {
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

function decodeAnswerTextByQuestionKey(questionKey: string, answerText: string) {
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

function isCodeLikeAnswerText(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  return /^[A-Z](?:\s*[,/|]\s*[A-Z])*$/i.test(normalized);
}

function resolvePreferredAnswerText(input: {
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

function toPercentScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 1) return clampPercent(value * 100);
  return clampPercent(value);
}

export function toTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function ensureSentence(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
}

function shortenLine(text: string, maxLength = 110) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function stripQuestionAndScoreTokens(text: string) {
  return text
    .replace(/\bS\d{2}_Q\d{2}\b/gi, " ")
    .replace(/\bQ\s*\d+\b/gi, " ")
    .replace(/\b[CS]\d{1,2}\b/gi, " ")
    .replace(/점수\s*\(?\d+\s*점\)?/g, " ")
    .replace(/\(\s*\d+\s*점\s*\)/g, " ")
    .replace(/\[\s*(상세|공통|생활습관 축|선택 영역)\s*\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeTitle(text: string) {
  return stripQuestionAndScoreTokens(text).replace(/^[\-:|/,\s]+|[\-:|/,\s]+$/g, "");
}

export function softenAdviceTone(text: string) {
  let updated = stripQuestionAndScoreTokens(text);
  const replacements: Array<[RegExp, string]> = [
    [/권장합니다/g, "도움이 됩니다"],
    [/추천합니다/g, "추천드려요"],
    [/필요합니다/g, "챙겨보면 좋습니다"],
    [/점검해 주세요/g, "한 번 살펴보세요"],
    [/확인해 주세요/g, "확인해보세요"],
    [/조정해 주세요/g, "조정해보세요"],
    [/관리해 주세요/g, "관리해보세요"],
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

function normalizeQuestionKey(input: {
  questionKey?: string;
  sectionId?: string;
  questionNumber?: number;
  category?: RiskCandidate["category"];
}) {
  const directKey = toTrimmedText(input.questionKey);
  if (directKey) return directKey;
  if (typeof input.questionNumber !== "number" || !Number.isFinite(input.questionNumber)) return "";

  if (input.category === "common") {
    return `C${String(input.questionNumber).padStart(2, "0")}`;
  }

  const sectionId = toTrimmedText(input.sectionId);
  if (sectionId) {
    return `${sectionId}_Q${String(input.questionNumber).padStart(2, "0")}`;
  }

  return "";
}

function buildSurveyAnswerLookup(payload: ReportSummaryPayload) {
  const lookup = new Map<string, SurveyAnswerLookup>();
  for (const answer of ensureArray(payload.survey?.answers)) {
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

function extractAnalysisCandidates(payload: ReportSummaryPayload): AnalysisCandidate[] {
  const sectionAdvice = payload.analysis?.wellness?.sectionAdvice ?? {};
  const surveyAnswerLookup = buildSurveyAnswerLookup(payload);
  const sectionScoreMap = new Map(
    ensureArray(payload.analysis?.wellness?.healthManagementNeed?.sections).map((section) => [
      section?.sectionId || "",
      clampPercent(section?.percent),
    ])
  );

  const rows: AnalysisCandidate[] = [];
  for (const [sectionId, row] of Object.entries(sectionAdvice)) {
    const sectionTitle =
      typeof row?.sectionTitle === "string" && row.sectionTitle.trim().length > 0
        ? row.sectionTitle.trim()
        : sectionId;
    const sectionPercent = sectionScoreMap.get(sectionId) ?? 0;

    for (const item of ensureArray(row?.items)) {
      const questionNumber =
        typeof item?.questionNumber === "number" ? item.questionNumber : Number.NaN;
      const questionKey = normalizeQuestionKey({
        questionKey: toTrimmedText(item?.questionKey),
        sectionId,
        questionNumber,
      });
      const surveyLookup = questionKey ? surveyAnswerLookup.get(questionKey) : undefined;
      const questionScore = toPercentScore(item?.score);
      const questionText =
        toTrimmedText(item?.questionText) || surveyLookup?.questionText || questionKey || `Q${questionNumber}`;
      const answerText = resolvePreferredAnswerText({
        questionKey,
        rawAnswerText: item?.answerText,
        surveyAnswerText: surveyLookup?.answerText,
        emptyFallback: "-",
      });
      const text = toTrimmedText(item?.text);
      if (!Number.isFinite(questionNumber) || questionScore == null || !text) continue;
      if (questionScore < 50) continue;
      rows.push({
        sectionId,
        sectionTitle,
        sectionPercent,
        questionNumber,
        questionKey,
        questionScore,
        questionText,
        answerText,
        text,
      });
    }
  }

  return rows.sort((left, right) => {
    if (right.questionScore !== left.questionScore) {
      return right.questionScore - left.questionScore;
    }
    if (right.sectionPercent !== left.sectionPercent) {
      return right.sectionPercent - left.sectionPercent;
    }
    if (left.questionNumber !== right.questionNumber) {
      return left.questionNumber - right.questionNumber;
    }
    return left.sectionTitle.localeCompare(right.sectionTitle);
  });
}

function pickBalancedAnalysisLines(candidates: AnalysisCandidate[], maxCount: number) {
  const grouped = new Map<string, AnalysisCandidate[]>();
  for (const row of candidates) {
    const key = `${row.sectionId}|${row.sectionTitle}`;
    const queue = grouped.get(key) ?? [];
    queue.push(row);
    grouped.set(key, queue);
  }

  const orderedKeys = [...grouped.entries()]
    .sort((left, right) => {
      const leftTop = left[1][0];
      const rightTop = right[1][0];
      if (rightTop.questionScore !== leftTop.questionScore) {
        return rightTop.questionScore - leftTop.questionScore;
      }
      if (rightTop.sectionPercent !== leftTop.sectionPercent) {
        return rightTop.sectionPercent - leftTop.sectionPercent;
      }
      return leftTop.sectionTitle.localeCompare(rightTop.sectionTitle);
    })
    .map(([key]) => key);

  const picked: AnalysisCandidate[] = [];
  while (picked.length < maxCount) {
    let hasItem = false;
    for (const key of orderedKeys) {
      const queue = grouped.get(key);
      if (!queue || queue.length === 0) continue;
      picked.push(queue.shift() as AnalysisCandidate);
      hasItem = true;
      if (picked.length >= maxCount) break;
    }
    if (!hasItem) break;
  }
  return picked;
}

export function buildFriendlyAnalysisLines(payload: ReportSummaryPayload) {
  const candidates = extractAnalysisCandidates(payload);
  const picked = pickBalancedAnalysisLines(candidates, MAX_ANALYSIS_LINES);
  return picked.map((item) => ({
    key: item.questionKey || `${item.sectionId}-${item.questionNumber}`,
    questionText: item.questionText,
    answerText: item.answerText,
    recommendation: shortenLine(ensureSentence(toTrimmedText(item.text)), 88),
  }));
}

function extractRiskCandidates(payload: ReportSummaryPayload): RiskCandidate[] {
  const rows = ensureArray(payload.analysis?.wellness?.highRiskHighlights);
  const surveyAnswerLookup = buildSurveyAnswerLookup(payload);
  const candidates: RiskCandidate[] = [];

  for (const item of rows) {
    const category = item?.category;
    if (
      category !== "detailed" &&
      category !== "common" &&
      category !== "domain" &&
      category !== "section"
    ) {
      continue;
    }

    const title = sanitizeTitle(toTrimmedText(item?.title));
    const action = ensureSentence(toTrimmedText(item?.action));
    if (!action) continue;
    const sectionId = toTrimmedText(item?.sectionId);

    const questionNumber =
      typeof item?.questionNumber === "number" && Number.isFinite(item.questionNumber)
        ? item.questionNumber
        : 999;
    const questionKey = normalizeQuestionKey({
      questionKey: toTrimmedText(item?.questionKey),
      sectionId,
      questionNumber: Number.isFinite(questionNumber) ? questionNumber : undefined,
      category,
    });
    const surveyLookup = questionKey ? surveyAnswerLookup.get(questionKey) : undefined;
    const questionText =
      sanitizeTitle(toTrimmedText(item?.questionText)) || surveyLookup?.questionText || title;
    const answerText = resolvePreferredAnswerText({
      questionKey,
      rawAnswerText: item?.answerText,
      surveyAnswerText: surveyLookup?.answerText,
      emptyFallback: "",
    });

    const score = clampPercent(toScoreValue(item?.score));

    candidates.push({
      category,
      title,
      score,
      action,
      questionKey,
      questionNumber,
      questionText,
      answerText,
    });
  }

  return candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.questionNumber !== right.questionNumber) return left.questionNumber - right.questionNumber;
    return left.title.localeCompare(right.title);
  });
}



export function buildFriendlyRiskLines(payload: ReportSummaryPayload) {
  const candidates = extractRiskCandidates(payload);
  const questionFirstCandidates = candidates.filter(
    (item) => item.category === "common" || item.category === "detailed"
  );
  const source = questionFirstCandidates.length > 0 ? questionFirstCandidates : candidates;
  const picked = source.slice(0, MAX_RISK_LINES);
  return picked.map((item) => ({
    key: item.questionKey || `${item.category}-${item.title || item.questionNumber}`,
    questionText: item.questionText || item.title || "확인 필요 항목",
    answerText: item.answerText || "",
    recommendation: shortenLine(item.action, 88),
    category: item.category,
  }));
}

function stripHtmlToPlainText(value: string) {
  return value
    .replace(/<sup>\s*([0-9]+)\s*<\/sup>/gi, "$1")
    .replace(/&sup2;/gi, "2")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatMetricValue(value?: string, unit?: string | null) {
  const base = stripHtmlToPlainText(toTrimmedText(value));
  if (!base) return "-";
  const normalizedUnit = stripHtmlToPlainText(toTrimmedText(unit));
  if (!normalizedUnit) return base;
  if (base.toLowerCase().includes(normalizedUnit.toLowerCase())) return base;
  return `${base} ${normalizedUnit}`;
}

export function resolveMetricStatusLabel(status?: string) {
  const normalized = toTrimmedText(status).toLowerCase();
  if (normalized === "high") return "주의";
  if (normalized === "low") return "주의";
  if (normalized === "caution") return "관찰";
  if (normalized === "normal") return "정상";
  return "안정";
}

export function buildHealthInsightLines(payload: ReportSummaryPayload) {
  const metrics = ensureArray(payload.health?.coreMetrics);
  const flagged = metrics
    .filter((row) => {
      const status = toTrimmedText(row?.status).toLowerCase();
      return status === "high" || status === "low" || status === "caution";
    })
    .slice(0, 3);

  const recommendations = ensureArray(payload.analysis?.recommendations)
    .map((row) => softenAdviceTone(toTrimmedText(row)))
    .filter(Boolean)
    .slice(0, 2);

  const lines: string[] = [];
  if (flagged.length === 0) {
    lines.push("최근 검진 수치에서 큰 이상 신호는 많지 않습니다. 현재 루틴을 꾸준히 유지해보세요.");
  } else {
    for (const metric of flagged) {
      const label = firstOrDash(metric?.label);
      const value = formatMetricValue(metric?.value, metric?.unit);
      lines.push(`${label} 수치가 ${value}로 확인되어, 생활 루틴을 조금 더 꼼꼼히 챙겨보세요.`);
    }
  }

  for (const recommendation of recommendations) {
    lines.push(recommendation);
  }

  return lines.slice(0, 4).map((line) => shortenLine(line));
}
