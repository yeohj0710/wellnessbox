import {
  clampScore,
  formatScore,
  scorePercent,
} from "@/lib/b2b/report-design";
import type {
  ReportScoreDetail,
  ReportScoreDetailMap,
  ReportScoreKey,
} from "@/lib/b2b/report-score-engine";

export type ScoreTone = "ok" | "warning" | "danger" | "muted";

export type ResolvedScoreInfo = {
  value: number | null;
  status: ReportScoreDetail["status"];
  source: ReportScoreDetail["source"];
  reason: string;
  label: string;
};

export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function firstOrDash(value: string | null | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export function scoreTone(score: number | null): ScoreTone {
  if (score == null) return "muted";
  if (score >= 80) return "ok";
  if (score >= 60) return "warning";
  return "danger";
}

export function scoreBarClass(score: number | null) {
  if (score == null) return "bg-slate-300";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export function badgeClass(tone: ScoreTone) {
  if (tone === "ok") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  if (tone === "danger") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function toneLabel(tone: ScoreTone) {
  if (tone === "ok") return "정상";
  if (tone === "warning") return "주의";
  if (tone === "danger") return "고위험";
  return "미측정";
}

export function toneColor(tone: ScoreTone) {
  if (tone === "ok") return "#16A34A";
  if (tone === "warning") return "#D97706";
  if (tone === "danger") return "#DC2626";
  return "#94A3B8";
}

export function toScoreValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return clampScore(value);
}

export function toScoreLabel(value: number | null) {
  if (value == null) return "점수 없음";
  return formatScore(value);
}

export function scoreWidth(value: number | null) {
  if (value == null) return 0;
  return scorePercent(value);
}

export function resolveScore(
  key: ReportScoreKey,
  fallbackValue: unknown,
  details: Partial<ReportScoreDetailMap> | undefined
): ResolvedScoreInfo {
  const detail = details?.[key] as ReportScoreDetail | undefined;
  const detailValue = toScoreValue(detail?.value);
  if (detail) {
    return {
      value: detailValue,
      status: detail.status,
      source: detail.source,
      reason: detail.reason,
      label: detail.label,
    };
  }
  const fallback = toScoreValue(fallbackValue);
  if (fallback != null) {
    return {
      value: fallback,
      status: "computed",
      source: "analysis_summary",
      reason: "분석 점수를 사용했습니다.",
      label: "",
    };
  }
  return {
    value: null,
    status: "missing",
    source: "none",
    reason: "점수를 산출할 데이터가 부족합니다.",
    label: "",
  };
}

export function buildSparklinePoints(
  scores: number[],
  options: {
    width: number;
    height: number;
    pad: number;
  }
) {
  if (scores.length === 0) return "";
  const width = options.width - options.pad * 2;
  const height = options.height - options.pad * 2;
  const stepX = scores.length > 1 ? width / (scores.length - 1) : 0;

  return scores
    .map((score, index) => {
      const x = options.pad + stepX * index;
      const y = options.height - options.pad - (score / 100) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function formatDelta(current: number | null, previous: number | null) {
  if (current == null) return "점수 데이터 부족";
  if (previous == null) return "비교 데이터 없음";
  const delta = current - previous;
  if (delta === 0) return "전월과 동일";
  if (delta > 0) return `전월 대비 +${delta}점`;
  return `전월 대비 ${delta}점`;
}
