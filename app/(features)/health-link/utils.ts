import { NHIS_ERR_CODE_HEALTHAGE_UNAVAILABLE } from "./constants";
import type { NhisDataRow, NhisPrimitive } from "./types";

const ERROR_CODE_PATTERN = /\[[A-Z0-9-]+\]\s*/g;
const TABLE_PRIORITY_KEYS = [
  "checkupDate",
  "year",
  "metric",
  "value",
  "itemName",
  "itemData",
  "height",
  "weight",
  "bmi",
  "bp",
  "systolic",
  "diastolic",
] as const;

const FIELD_LABELS: Record<string, string> = {
  metric: "검진 항목",
  value: "측정값",
  checkupDate: "검진일",
  year: "연도",
  itemName: "검진 항목",
  itemData: "측정값",
  result: "결과",
  height: "키",
  weight: "체중",
  bmi: "BMI",
  waist: "허리둘레",
  bp: "혈압",
  bloodPressure: "혈압",
  systolic: "수축기 혈압",
  diastolic: "이완기 혈압",
  pulse: "맥박",
  hemoglobin: "혈색소",
  glucose: "혈당",
  cholesterol: "총 콜레스테롤",
  hdl: "HDL",
  ldl: "LDL",
  triglyceride: "중성지방",
  ast: "AST",
  alt: "ALT",
  ggt: "GGT",
  creatinine: "크레아티닌",
  egfr: "eGFR",
  bun: "요소질소",
  uric: "요산",
};

const CHECKUP_METRIC_EXCLUDED_KEY_PATTERN =
  /(agency|hospital|hsp|pharm|clinic|org|provider|institution|place|address|name|subject|examinee|detailkey|title|qtitle|comment|memo|opinion|error|code|기관|병원|약국|주소|성명|이름|구분)/i;

const CHECKUP_METRIC_INCLUDED_KEY_PATTERN =
  /(height|weight|bmi|waist|bp|pressure|systolic|diastolic|pulse|heart|vision|hearing|hemoglobin|glucose|sugar|a1c|cholesterol|hdl|ldl|triglyceride|ast|alt|gamma|ggt|creatinine|egfr|bun|albumin|protein|uric|rbc|wbc|platelet|hematocrit|hematoglobin|키|체중|혈압|허리|맥박|혈색소|혈당|콜레스테롤|중성지방|간수치|크레아티닌|사구체|요산)/i;

const CHECKUP_METRIC_NUMERIC_VALUE_PATTERN =
  /^-?\d+(?:,\d{3})*(?:\.\d+)?(?:\s?(%|kg|cm|mmhg|mg\/dl|g\/dl|bpm|kg\/m2))?$/i;
const CHECKUP_METRIC_BP_VALUE_PATTERN = /^\d{2,3}\s*\/\s*\d{2,3}$/;

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

function normalizeKeyLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapFieldLabel(key: string) {
  return FIELD_LABELS[key] || normalizeKeyLabel(key);
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

export function formatDataCell(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "Y" : "N";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ko-KR") : "-";
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "-";
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatDataCell(item)).join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 3)
      .map(([key, entryValue]) => `${mapFieldLabel(key)}: ${formatDataCell(entryValue)}`);
    return entries.join(" | ") || "-";
  }
  return String(value);
}

function isFilledPrimitive(value: NhisPrimitive | undefined) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function asPrimitiveOrUndefined(value: unknown): NhisPrimitive | undefined {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function isMetricValue(value: NhisPrimitive | undefined) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return (
    CHECKUP_METRIC_NUMERIC_VALUE_PATTERN.test(normalized) ||
    CHECKUP_METRIC_BP_VALUE_PATTERN.test(normalized)
  );
}

export function pickTableColumns(rows: NhisDataRow[], maxColumns = 8): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!isFilledPrimitive(value)) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const keys = [...counts.keys()];
  keys.sort((left, right) => {
    const leftPriority = TABLE_PRIORITY_KEYS.indexOf(
      left as (typeof TABLE_PRIORITY_KEYS)[number]
    );
    const rightPriority = TABLE_PRIORITY_KEYS.indexOf(
      right as (typeof TABLE_PRIORITY_KEYS)[number]
    );

    if (leftPriority >= 0 || rightPriority >= 0) {
      if (leftPriority < 0) return 1;
      if (rightPriority < 0) return -1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    }

    const countDiff = (counts.get(right) || 0) - (counts.get(left) || 0);
    if (countDiff !== 0) return countDiff;
    return left.localeCompare(right, "ko");
  });

  return keys.slice(0, maxColumns);
}

export function mapTargetLabel(target: string) {
  if (target === "medical") return "진료정보";
  if (target === "medication") return "투약정보";
  if (target === "checkupList") return "건강검진 결과 목록";
  if (target === "checkupYearly") return "연도별 건강검진 상세";
  if (target === "checkupOverview") return "건강검진 결과 한눈에 보기";
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

function resolveMeasuredDate(row: NhisDataRow): NhisPrimitive {
  return (
    asPrimitiveOrUndefined(row.checkupDate) ??
    asPrimitiveOrUndefined(row.date) ??
    asPrimitiveOrUndefined(row.year) ??
    null
  );
}

export function filterCheckupMetricRows(rows: NhisDataRow[]): NhisDataRow[] {
  const out: NhisDataRow[] = [];
  const seen = new Set<string>();

  const pushMetricRow = (metric: string, value: NhisPrimitive, measuredAt: NhisPrimitive) => {
    const normalizedMetric = metric.trim();
    if (!normalizedMetric || !isMetricValue(value)) return;
    const signature = `${normalizedMetric}|${String(value)}|${String(measuredAt ?? "")}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    const nextRow: NhisDataRow = {
      metric: normalizedMetric,
      value,
    };
    if (isFilledPrimitive(measuredAt)) {
      nextRow.checkupDate = measuredAt;
    }
    out.push(nextRow);
  };

  for (const row of rows) {
    const measuredAt = resolveMeasuredDate(row);
    const itemName = typeof row.itemName === "string" ? row.itemName.trim() : "";
    const itemData = asPrimitiveOrUndefined(row.itemData);

    if (itemName && isMetricValue(itemData)) {
      pushMetricRow(itemName, itemData ?? null, measuredAt);
    }

    for (const [key, rawValue] of Object.entries(row)) {
      if (key === "itemName" || key === "itemData") continue;
      const value = asPrimitiveOrUndefined(rawValue);
      if (!isFilledPrimitive(value)) continue;
      if (CHECKUP_METRIC_EXCLUDED_KEY_PATTERN.test(key)) continue;
      if (!CHECKUP_METRIC_INCLUDED_KEY_PATTERN.test(key)) continue;
      pushMetricRow(mapFieldLabel(key), value ?? null, measuredAt);
    }
  }

  return out;
}
