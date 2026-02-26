export const REPORT_ACCENT_COLORS = {
  primary: "#1D4ED8",
  secondary: "#0F766E",
  warning: "#B45309",
  danger: "#B91C1C",
  neutral: "#475569",
};

export const REPORT_STYLE_CANDIDATES = ["fresh", "calm", "focus"] as const;

export function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function scorePercent(value: unknown) {
  return clampScore(value);
}

export function formatScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}점`;
}

export function normalizeRiskLevelLabel(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "평가 대기";
  if (["high", "높음", "고위험"].includes(normalized)) return "고위험";
  if (["medium", "중간", "주의"].includes(normalized)) return "주의";
  if (["low", "낮음", "정상"].includes(normalized)) return "정상";
  return value || "평가 대기";
}

export function normalizeMetricStatusLabel(status?: string) {
  const normalized = (status || "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "미측정/데이터 없음";
  if (normalized === "normal") return "정상";
  if (normalized === "high") return "고위험";
  if (normalized === "low") return "주의";
  if (normalized === "caution") return "주의";
  return status || "미측정/데이터 없음";
}

export function resolveMetricStatusTone(status?: string) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "high") return "danger";
  if (normalized === "low" || normalized === "caution") return "warning";
  if (normalized === "normal") return "ok";
  return "muted";
}

export function medicationStatusLabel(type?: string) {
  if (type === "available") return "연동 완료";
  if (type === "none") return "복약 없음";
  if (type === "fetch_failed") return "조회 실패";
  return "미연동/확인 필요";
}

export function medicationStatusTone(type?: string) {
  if (type === "available") return "ok";
  if (type === "none") return "muted";
  if (type === "fetch_failed") return "danger";
  return "warning";
}
