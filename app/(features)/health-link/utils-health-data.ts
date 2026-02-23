import type { NhisDataRow, NhisPrimitive } from "./types";
import { mapFieldLabel } from "./utils-format";
import {
  isCheckupCautionText,
  isCheckupNormalText,
  parseNumberFromText,
  parseRangeFromText,
  resolveToneFromMetricRange,
  type NumericRange,
} from "./utils-health-metric-tone";

const CHECKUP_METRIC_EXCLUDED_KEY_PATTERN =
  /(agency|hospital|hsp|pharm|clinic|org|provider|institution|place|address|name|subject|examinee|detailkey|title|qtitle|comment|memo|opinion|error|code|category|group)/i;

const CHECKUP_METRIC_INCLUDED_KEY_PATTERN =
  /(height|weight|bmi|waist|bp|pressure|systolic|diastolic|pulse|heart|vision|hearing|hemoglobin|glucose|sugar|a1c|cholesterol|hdl|ldl|triglyceride|ast|alt|gamma|ggt|creatinine|egfr|bun|albumin|protein|uric|rbc|wbc|platelet|hematocrit|hematoglobin)/i;

const CHECKUP_METRIC_NUMERIC_VALUE_PATTERN =
  /^-?\d+(?:,\d{3})*(?:\.\d+)?(?:\s?(%|kg|cm|mmhg|mg\/dl|g\/dl|bpm|kg\/m2))?$/i;
const CHECKUP_METRIC_BP_VALUE_PATTERN = /^\d{2,3}\s*\/\s*\d{2,3}$/;


const PRESERVED_SOURCE_KEYS = [
  "itemName",
  "itemData",
  "result",
  "div",
  "normalA",
  "normalB",
  "suspicionDis",
  "targetDis",
  "unit",
  "inspectItem",
  "type",
  "year",
  "chkAgency",
  "overallResult",
] as const;

export type CheckupMetricTone = "normal" | "caution" | "unknown";

export type LatestCheckupMeta = {
  year: string | null;
  checkupDate: string | null;
  agency: string | null;
  overallResult: string | null;
};

export type MedicationDigest = {
  totalRows: number;
  uniqueMedicineCount: number;
  topMedicines: Array<{ label: string; count: number }>;
  topConditions: Array<{ label: string; count: number }>;
  recentMedications: Array<{
    date: string;
    medicine: string;
    effect: string | null;
  }>;
};

function isFilledPrimitive(value: NhisPrimitive | undefined) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function asPrimitiveOrUndefined(value: unknown): NhisPrimitive | undefined {
  if (value == null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
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

function resolveMeasuredDate(row: NhisDataRow): NhisPrimitive {
  return (
    asPrimitiveOrUndefined(row.checkupDate) ??
    asPrimitiveOrUndefined(row.date) ??
    asPrimitiveOrUndefined(row.year) ??
    null
  );
}

function primitiveToText(value: NhisPrimitive | undefined) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function pickFirstText(row: NhisDataRow, keys: string[]) {
  for (const key of keys) {
    const text = primitiveToText(asPrimitiveOrUndefined(row[key]));
    if (text) return text;
  }
  return null;
}

function parseYearValue(value: string | null) {
  if (!value) return 0;
  const match = value.match(/(20\d{2}|19\d{2})/);
  if (!match) return 0;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : 0;
}

function parseMonthDayValue(value: string | null) {
  if (!value) return { month: 0, day: 0 };
  const match = value.match(/(\d{1,2})[./-](\d{1,2})/);
  if (!match) return { month: 0, day: 0 };
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return { month: 0, day: 0 };
  }
  return { month, day };
}

function compareCheckupKey(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number }
) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

function resolveCheckupSortKey(row: NhisDataRow) {
  const yearText = pickFirstText(row, ["year", "checkupDate", "date"]);
  const dateText = pickFirstText(row, ["checkupDate", "date"]);
  const year = parseYearValue(yearText);
  const { month, day } = parseMonthDayValue(dateText);
  return { year, month, day };
}


export function filterCheckupMetricRows(rows: NhisDataRow[]): NhisDataRow[] {
  const out: NhisDataRow[] = [];
  const seen = new Set<string>();

  const pushMetricRow = (
    metric: string,
    value: NhisPrimitive,
    measuredAt: NhisPrimitive,
    sourceRow: NhisDataRow,
    allowNonNumeric = false
  ) => {
    const normalizedMetric = metric.trim();
    if (!normalizedMetric) return;
    if (allowNonNumeric) {
      if (!isFilledPrimitive(value)) return;
    } else if (!isMetricValue(value)) {
      return;
    }
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

    for (const key of PRESERVED_SOURCE_KEYS) {
      const copied = asPrimitiveOrUndefined(sourceRow[key]);
      if (isFilledPrimitive(copied)) {
        nextRow[key] = copied as NhisPrimitive;
      }
    }

    out.push(nextRow);
  };

  for (const row of rows) {
    const measuredAt = resolveMeasuredDate(row);
    const explicitMetric =
      typeof row.metric === "string" ? row.metric.trim() : "";
    const explicitValue = asPrimitiveOrUndefined(row.value);
    const hasExplicitMetricRow =
      explicitMetric.length > 0 && isFilledPrimitive(explicitValue);
    if (hasExplicitMetricRow) {
      pushMetricRow(explicitMetric, explicitValue ?? null, measuredAt, row, true);
    }

    const itemName = typeof row.itemName === "string" ? row.itemName.trim() : "";
    const itemData = asPrimitiveOrUndefined(row.itemData);
    if (!hasExplicitMetricRow && itemName && isFilledPrimitive(itemData)) {
      pushMetricRow(itemName, itemData ?? null, measuredAt, row, true);
    }

    for (const [key, rawValue] of Object.entries(row)) {
      if (key === "itemName" || key === "itemData") continue;
      const value = asPrimitiveOrUndefined(rawValue);
      if (!isFilledPrimitive(value)) continue;
      if (CHECKUP_METRIC_EXCLUDED_KEY_PATTERN.test(key)) continue;
      if (!CHECKUP_METRIC_INCLUDED_KEY_PATTERN.test(key)) continue;
      pushMetricRow(mapFieldLabel(key), value ?? null, measuredAt, row);
    }
  }

  return out;
}

export function selectLatestCheckupRows(rows: NhisDataRow[]) {
  if (rows.length === 0) return [];

  let bestKey = resolveCheckupSortKey(rows[0]);
  for (let index = 1; index < rows.length; index += 1) {
    const nextKey = resolveCheckupSortKey(rows[index]);
    if (compareCheckupKey(nextKey, bestKey) > 0) {
      bestKey = nextKey;
    }
  }

  return rows.filter((row) => {
    const key = resolveCheckupSortKey(row);
    if (key.year !== bestKey.year) return false;
    if (bestKey.month === 0 && bestKey.day === 0) return true;
    return key.month === bestKey.month && key.day === bestKey.day;
  });
}

export function extractLatestCheckupMeta(rows: NhisDataRow[]): LatestCheckupMeta {
  const year =
    rows
      .map((row) => pickFirstText(row, ["year"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const checkupDate =
    rows
      .map((row) => pickFirstText(row, ["checkupDate", "date"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const agency =
    rows
      .map((row) => pickFirstText(row, ["chkAgency", "agency", "hospitalNm"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const overallResult =
    rows
      .map((row) => pickFirstText(row, ["overallResult", "result"]))
      .find((value): value is string => Boolean(value)) ?? null;

  return {
    year,
    checkupDate,
    agency,
    overallResult,
  };
}

export function resolveCheckupMetricTone(row: NhisDataRow): CheckupMetricTone {
  const metricText =
    pickFirstText(row, ["metric", "itemName", "inspectItem", "type"]) ?? "";
  const resultText = pickFirstText(row, ["value", "itemData", "result"]) ?? "";
  const divText = pickFirstText(row, ["div"]) ?? "";
  const referenceTexts = [
    pickFirstText(row, ["normalA"]),
    pickFirstText(row, ["normalB"]),
    pickFirstText(row, ["suspicionDis"]),
  ];
  const hasReference = referenceTexts.some((value) => Boolean(value));
  const mergedText = `${metricText} ${divText} ${resultText}`.trim();

  if (isCheckupCautionText(mergedText)) return "caution";
  if (isCheckupNormalText(mergedText)) return "normal";

  if (metricText && resultText) {
    const byRule = resolveToneFromMetricRange(metricText, resultText);
    if (byRule) return byRule;
  }

  if (resultText) {
    const value = parseNumberFromText(resultText);
    const ranges = referenceTexts
      .map((text) => parseRangeFromText(text))
      .filter((range): range is NumericRange => range !== null);
    if (value !== null && ranges.length > 0) {
      const matchedRange = ranges.find(
        (range) =>
          (typeof range.min !== "number" || value >= range.min) &&
          (typeof range.max !== "number" || value <= range.max)
      );
      return matchedRange ? "normal" : "caution";
    }
  }

  if (hasReference) return "normal";
  return "normal";
}

function parseSortableDateScore(value: string | null) {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function toTopCountItems(source: Map<string, number>, maxItems: number) {
  return [...source.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko")
    )
    .slice(0, maxItems)
    .map(([label, count]) => ({ label, count }));
}

function incrementCount(source: Map<string, number>, value: string | null) {
  if (!value) return;
  source.set(value, (source.get(value) ?? 0) + 1);
}

export function summarizeMedicationRows(rows: NhisDataRow[]): MedicationDigest {
  const medicineCount = new Map<string, number>();
  const conditionCount = new Map<string, number>();
  const recentItems = new Map<
    string,
    { date: string; medicine: string; effect: string | null }
  >();

  for (const row of rows) {
    const medicine = pickFirstText(row, [
      "medicineNm",
      "drug_MEDI_PRDC_NM",
      "MEDI_PRDC_NM",
    ]);
    const condition = pickFirstText(row, [
      "diagType",
      "drug_MOHW_CLSF",
      "detail_MOHW_CLSF",
      "medicineEffect",
    ]);
    const date = pickFirstText(row, ["diagDate", "medDate"]);
    const effect = pickFirstText(row, [
      "medicineEffect",
      "drug_EFFT_EFT_CNT",
      "EFFT_EFT_CNT",
    ]);

    incrementCount(medicineCount, medicine);
    incrementCount(conditionCount, condition);

    if (!medicine || !date) continue;
    const signature = `${date}|${medicine}`;
    if (!recentItems.has(signature)) {
      recentItems.set(signature, {
        date,
        medicine,
        effect: effect ?? null,
      });
    }
  }

  const recentMedications = [...recentItems.values()]
    .sort(
      (left, right) =>
        parseSortableDateScore(right.date) - parseSortableDateScore(left.date) ||
        left.medicine.localeCompare(right.medicine, "ko")
    )
    .slice(0, 6);

  return {
    totalRows: rows.length,
    uniqueMedicineCount: medicineCount.size,
    topMedicines: toTopCountItems(medicineCount, 5),
    topConditions: toTopCountItems(conditionCount, 5),
    recentMedications,
  };
}
