import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import {
  buildSurveyAnswerLookup,
  clampPercent,
  decodeAnswerTextByQuestionKey,
  ensureSentence,
  resolveHealthScoreLabel,
  resolvePreferredAnswerText,
  sanitizeTitle,
  shortenLine,
  softenAdviceTone,
  toTrimmedText,
} from "./card-insight-text";
import { ensureArray, firstOrDash, toScoreValue } from "./helpers";

export {
  clampPercent,
  decodeAnswerTextByQuestionKey,
  ensureSentence,
  resolveHealthScoreLabel,
  resolvePreferredAnswerText,
  sanitizeTitle,
  softenAdviceTone,
  toTrimmedText,
} from "./card-insight-text";

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

function toPercentScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 1) return clampPercent(value * 100);
  return clampPercent(value);
}

function normalizeQuestionKey(input: {
  questionKey?: string;
  sectionId?: string;
  questionNumber?: number;
  category?: RiskCandidate["category"];
}) {
  const directKey = toTrimmedText(input.questionKey);
  if (directKey) return directKey;
  if (typeof input.questionNumber !== "number" || !Number.isFinite(input.questionNumber)) {
    return "";
  }

  if (input.category === "common") {
    return `C${String(input.questionNumber).padStart(2, "0")}`;
  }

  const sectionId = toTrimmedText(input.sectionId);
  if (sectionId) {
    return `${sectionId}_Q${String(input.questionNumber).padStart(2, "0")}`;
  }

  return "";
}

function normalizeRiskIdentityText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveRiskCandidateIdentity(candidate: RiskCandidate) {
  const normalizedQuestionText = normalizeRiskIdentityText(candidate.questionText);
  if (normalizedQuestionText) return `question:${normalizedQuestionText}`;
  const normalizedQuestionKey = normalizeRiskIdentityText(candidate.questionKey);
  if (normalizedQuestionKey) return `key:${normalizedQuestionKey}`;
  const normalizedTitle = normalizeRiskIdentityText(candidate.title);
  if (normalizedTitle) return `title:${normalizedTitle}`;
  return "";
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
        toTrimmedText(item?.questionText) ||
        surveyLookup?.questionText ||
        questionKey ||
        `Q${questionNumber}`;
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

export function buildFriendlyAnalysisLines(
  payload: ReportSummaryPayload,
  maxCount = MAX_ANALYSIS_LINES
) {
  const candidates = extractAnalysisCandidates(payload);
  const safeMaxCount = Number.isFinite(maxCount)
    ? Math.max(1, Math.floor(maxCount))
    : MAX_ANALYSIS_LINES;
  const picked = pickBalancedAnalysisLines(candidates, safeMaxCount);
  return picked.map((item) => ({
    key: item.questionKey || `${item.sectionId}-${item.questionNumber}`,
    questionText: item.questionText,
    answerText: item.answerText,
    sectionId: item.sectionId,
    sectionTitle: item.sectionTitle,
    score: item.questionScore,
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

  const sorted = candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.questionNumber !== right.questionNumber) {
      return left.questionNumber - right.questionNumber;
    }
    return left.title.localeCompare(right.title);
  });

  const deduped: RiskCandidate[] = [];
  const seenRiskIdentities = new Set<string>();
  for (const candidate of sorted) {
    const identity = resolveRiskCandidateIdentity(candidate);
    if (identity && seenRiskIdentities.has(identity)) continue;
    deduped.push(candidate);
    if (identity) {
      seenRiskIdentities.add(identity);
    }
  }

  return deduped;
}

export function buildFriendlyRiskLines(
  payload: ReportSummaryPayload,
  maxCount = MAX_RISK_LINES
) {
  const candidates = extractRiskCandidates(payload);
  const questionFirstCandidates = candidates.filter(
    (item) => item.category === "common" || item.category === "detailed"
  );
  const source = questionFirstCandidates.length > 0 ? questionFirstCandidates : candidates;
  const safeMaxCount = Number.isFinite(maxCount)
    ? Math.max(1, Math.floor(maxCount))
    : MAX_RISK_LINES;
  const picked = source.slice(0, safeMaxCount);
  return picked.map((item) => ({
    key: item.questionKey || `${item.category}-${item.title || item.questionNumber}`,
    questionText: item.questionText || item.title || "확인 필요 항목",
    answerText: item.answerText || "",
    recommendation: shortenLine(item.action, 88),
    category: item.category,
  }));
}

export function buildDetailedSectionAdviceLines(
  payload: ReportSummaryPayload,
  maxCount = Number.POSITIVE_INFINITY
) {
  const candidates = extractAnalysisCandidates(payload);
  const safeMaxCount = Number.isFinite(maxCount)
    ? Math.max(1, Math.floor(maxCount))
    : Number.POSITIVE_INFINITY;

  return candidates.slice(0, safeMaxCount).map((item) => ({
    key: item.questionKey || `${item.sectionId}-${item.questionNumber}`,
    sectionId: item.sectionId,
    sectionTitle: item.sectionTitle,
    questionNumber: item.questionNumber,
    questionText: item.questionText,
    answerText: item.answerText || "-",
    score: item.questionScore,
    recommendation: shortenLine(ensureSentence(toTrimmedText(item.text)), 100),
  }));
}

export function buildDetailedRiskHighlightLines(
  payload: ReportSummaryPayload,
  maxCount = Number.POSITIVE_INFINITY
) {
  const candidates = extractRiskCandidates(payload);
  const safeMaxCount = Number.isFinite(maxCount)
    ? Math.max(1, Math.floor(maxCount))
    : Number.POSITIVE_INFINITY;

  return candidates.slice(0, safeMaxCount).map((item) => ({
    key: item.questionKey || `${item.category}-${item.title || item.questionNumber}`,
    category: item.category,
    title: item.title,
    score: item.score,
    questionText: item.questionText || item.title || "확인 필요 항목",
    answerText: item.answerText || "",
    recommendation: shortenLine(item.action, 100),
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
  return "미정";
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
    lines.push(
      "최근 검진 수치에서 눈에 띄는 이상 신호가 많지 않습니다. 현재 루틴을 꾸준히 이어가보세요."
    );
  } else {
    for (const metric of flagged) {
      const label = firstOrDash(metric?.label);
      const value = formatMetricValue(metric?.value, metric?.unit);
      lines.push(`${label} 수치가 ${value}로 확인되어, 생활 루틴을 조금 더 챙겨보세요.`);
    }
  }

  for (const recommendation of recommendations) {
    lines.push(recommendation);
  }

  return lines.slice(0, 4).map((line) => shortenLine(line));
}
