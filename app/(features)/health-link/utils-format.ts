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
  metric: "지표",
  value: "값",
  checkupDate: "검진일",
  year: "연도",
  overallResult: "종합소견",
  chkAgency: "검진기관",
  itemName: "항목명",
  itemData: "측정값",
  result: "결과",
  type: "검사구분",
  unit: "단위",
  normalA: "정상A 기준",
  normalB: "정상B 기준",
  targetDis: "대상질환",
  suspicionDis: "질환의심",
  inspectItem: "검사항목",
  height: "신장",
  weight: "체중",
  bmi: "BMI",
  waist: "허리둘레",
  bp: "혈압",
  bloodPressure: "혈압",
  systolic: "수축기",
  diastolic: "이완기",
  pulse: "맥박",
  hemoglobin: "혈색소",
  glucose: "혈당",
  cholesterol: "총콜레스테롤",
  hdl: "HDL",
  ldl: "LDL",
  triglyceride: "중성지방",
  ast: "AST",
  alt: "ALT",
  ggt: "GGT",
  creatinine: "크레아티닌",
  egfr: "eGFR",
  bun: "BUN",
  uric: "요산",
};

function normalizeKeyLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFilledPrimitive(value: NhisPrimitive | undefined) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

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
  if (typeof value === "boolean") return value ? "예" : "아니오";
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
  if (target === "medical") return "진료";
  if (target === "medication") return "투약";
  if (target === "checkupList") return "검진 목록";
  if (target === "checkupYearly") return "검진 상세(연도별)";
  if (target === "checkupOverview") return "검진 요약";
  if (target === "healthAge") return "건강나이";
  return target;
}

export function toJsonPreview(value: unknown, maxChars = 12000) {
  const text = JSON.stringify(value ?? null, null, 2) || "null";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... (일부 생략)`;
}
