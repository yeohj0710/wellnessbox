import { NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE } from "./constants";

type RiskTable = unknown;

const ERROR_CODE_PATTERN = /\[[A-Z0-9-]+\]\s*/g;

export function parseErrorMessage(text: string | undefined, fallback: string) {
  const raw = (text || "").trim();
  if (!raw) return fallback;
  return raw
    .replace(ERROR_CODE_PATTERN, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toCompactLine(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 4)
      .map(([key, entryValue]) => `${key}: ${String(entryValue ?? "-")}`);
    return entries.join(" | ");
  }
  return String(value);
}

export function mapTargetLabel(target: string) {
  if (target === "medical") return "진료정보";
  if (target === "medication") return "투약정보";
  if (target === "healthAge") return "건강나이";
  return target;
}

export function describeFetchFailure(failure: {
  target: string;
  errCd?: string | null;
  errMsg?: string | null;
}) {
  if (
    failure.target === "healthAge" &&
    (failure.errCd || "").trim() === NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE
  ) {
    return "건강나이는 건강검진 내역이 있는 경우에만 제공됩니다.";
  }
  return parseErrorMessage(failure.errMsg || undefined, "요청 실패");
}

export function toJsonPreview(value: unknown, maxChars = 12000) {
  const text = JSON.stringify(value ?? null, null, 2) || "null";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... (truncated)`;
}

export function formatYmd(value?: string | null) {
  if (!value) return "-";
  const normalized = value.replace(/\D/g, "");
  if (!/^\d{8}$/.test(normalized)) return value;
  return `${normalized.slice(0, 4)}.${normalized.slice(4, 6)}.${normalized.slice(6, 8)}`;
}

export function toRiskFactorLines(riskFactorTable: RiskTable): string[] {
  if (Array.isArray(riskFactorTable)) {
    return riskFactorTable.slice(0, 6).map((row) => toCompactLine(row) || "-");
  }

  if (riskFactorTable && typeof riskFactorTable === "object") {
    return Object.entries(riskFactorTable as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, value]) => `${key}: ${String(value ?? "-")}`);
  }

  return [];
}
