import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { ensureArray, firstOrDash, toScoreValue } from "./helpers";

const MAX_ANALYSIS_LINES = 3;
const MAX_RISK_LINES = 4;

type AnalysisCandidate = {
  sectionId: string;
  sectionTitle: string;
  sectionPercent: number;
  questionNumber: number;
  questionScore: number;
  text: string;
};

type RiskCandidate = {
  category: "detailed" | "common" | "domain" | "section";
  title: string;
  score: number;
  action: string;
  questionNumber: number;
};

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

function extractAnalysisCandidates(payload: ReportSummaryPayload): AnalysisCandidate[] {
  const sectionAdvice = payload.analysis?.wellness?.sectionAdvice ?? {};
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
      const questionScore = toPercentScore(item?.score);
      const text = toTrimmedText(item?.text);
      if (!Number.isFinite(questionNumber) || questionScore == null || !text) continue;
      if (questionScore < 50) continue;
      rows.push({
        sectionId,
        sectionTitle,
        sectionPercent,
        questionNumber,
        questionScore,
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
  return picked.map((item) => {
    const sectionTitle = sanitizeTitle(item.sectionTitle) || "선택 영역";
    const text = softenAdviceTone(item.text);
    return {
      key: `${item.sectionId}-${item.questionNumber}`,
      text: shortenLine(`${sectionTitle} 영역은 ${text}`),
    };
  });
}

function extractRiskCandidates(payload: ReportSummaryPayload): RiskCandidate[] {
  const rows = ensureArray(payload.analysis?.wellness?.highRiskHighlights);
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
    const action = softenAdviceTone(toTrimmedText(item?.action));
    if (!action) continue;

    const questionNumber =
      typeof item?.questionNumber === "number" && Number.isFinite(item.questionNumber)
        ? item.questionNumber
        : 999;

    const score = clampPercent(toScoreValue(item?.score));
    if (score < 50) continue;

    candidates.push({
      category,
      title,
      score,
      action,
      questionNumber,
    });
  }

  return candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.questionNumber !== right.questionNumber) return left.questionNumber - right.questionNumber;
    return left.title.localeCompare(right.title);
  });
}

function pickBalancedRiskLines(candidates: RiskCandidate[], maxCount: number) {
  const selected: RiskCandidate[] = [];
  const selectedCategory = new Set<RiskCandidate["category"]>();

  for (const row of candidates) {
    if (selectedCategory.has(row.category)) continue;
    selected.push(row);
    selectedCategory.add(row.category);
    if (selected.length >= maxCount) return selected;
  }

  for (const row of candidates) {
    if (selected.some((item) => item.category === row.category && item.title === row.title)) continue;
    selected.push(row);
    if (selected.length >= maxCount) break;
  }

  return selected;
}

function riskLead(category: RiskCandidate["category"], title: string) {
  if (category === "detailed") {
    return title ? `${title} 항목은` : "우선 조정이 필요한 항목은";
  }
  if (category === "common") {
    return title ? `생활 습관 중 ${title} 부분은` : "생활 습관에서는";
  }
  if (category === "domain") {
    return title ? `${title} 축은` : "생활 습관 축에서는";
  }
  return title ? `${title} 영역은` : "선택 영역에서는";
}

export function buildFriendlyRiskLines(payload: ReportSummaryPayload) {
  const candidates = extractRiskCandidates(payload);
  const picked = pickBalancedRiskLines(candidates, MAX_RISK_LINES);
  return picked.map((item) => {
    const merged = ensureSentence(`${riskLead(item.category, item.title)} ${item.action}`);
    return {
      key: `${item.category}-${item.title || item.questionNumber}`,
      text: shortenLine(merged),
    };
  });
}

export function formatMetricValue(value?: string, unit?: string | null) {
  const base = toTrimmedText(value);
  if (!base) return "-";
  const normalizedUnit = toTrimmedText(unit);
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
