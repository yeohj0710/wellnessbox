import type { NhisDataRow, NhisPrimitive } from "./types";
import { formatDataCell, mapFieldLabel } from "./utils-format";
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
const CHECKUP_METRIC_BP_COMPLETE_PATTERN =
  /^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?$/i;
const CHECKUP_METRIC_BP_INCOMPLETE_PATTERN =
  /^(?:\/\s*\d{2,3}|\d{2,3}\s*\/)(?:\s*mmhg)?$/i;
const CHECKUP_METRIC_UNIT_ONLY_PATTERN =
  /^(?:kg\/m2|kg\/m²|kg\/㎡|mmhg|mg\/dl|g\/dl|bpm|cm|kg|%|mmol\/l|회\/분|㎎\/㎗|㎜hg)$/i;
const CHECKUP_METRIC_VALUE_HAS_UNIT_PATTERN =
  /(mmhg|mg\/dl|g\/dl|kg\/m2|kg\/m²|kg\/㎡|mmol\/l|bpm|cm|kg|%|회\/분|㎎\/㎗|㎜hg)/i;
const CHECKUP_BLOOD_PRESSURE_METRIC_PATTERN =
  /(혈압|수축기|이완기|pressure|bp)/i;


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

function toDisplayText(value: unknown) {
  const text = formatDataCell(value);
  if (!text || text === "-") return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCompactText(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function isUnitOnlyMetricText(value: string) {
  return CHECKUP_METRIC_UNIT_ONLY_PATTERN.test(normalizeCompactText(value));
}

function hasMetricNumericToken(value: string) {
  if (CHECKUP_METRIC_BP_COMPLETE_PATTERN.test(normalizeCompactText(value))) {
    return true;
  }
  return parseNumberFromText(value) !== null;
}

function maybeAppendMetricUnit(value: string, unit: string | null) {
  if (!unit) return value;
  if (!hasMetricNumericToken(value)) return value;
  if (CHECKUP_METRIC_VALUE_HAS_UNIT_PATTERN.test(value)) return value;
  return `${value} ${unit}`.trim();
}

function resolveMetricUnitText(row: NhisDataRow) {
  const unit = toDisplayText(row.unit);
  if (!unit) return null;
  return normalizeCompactText(unit);
}

function normalizeBloodPressureDisplay(value: string, unit: string | null) {
  const compact = normalizeCompactText(value);
  const match = compact.match(CHECKUP_METRIC_BP_COMPLETE_PATTERN);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  const base = `${systolic}/${diastolic}`;
  return maybeAppendMetricUnit(base, unit || "mmHg");
}

function toIntegerText(value: unknown) {
  const text = toDisplayText(value);
  if (!text) return null;
  const parsed = parseNumberFromText(text);
  if (parsed === null || !Number.isFinite(parsed)) return null;
  return String(Math.round(parsed));
}

function resolveBloodPressureValue(row: NhisDataRow, unit: string | null) {
  const candidates = [
    row.itemData,
    row.value,
    row.result,
    row.bp,
    row.bloodPressure,
  ]
    .map((item) => toDisplayText(item))
    .filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    const normalized = normalizeBloodPressureDisplay(candidate, unit);
    if (normalized) return normalized;
  }

  const systolic = [
    row.systolic,
    row.maxBp,
    row.highBp,
    row.highBloodPressure,
  ]
    .map((item) => toIntegerText(item))
    .find((item): item is string => Boolean(item));
  const diastolic = [
    row.diastolic,
    row.minBp,
    row.lowBp,
    row.lowBloodPressure,
  ]
    .map((item) => toIntegerText(item))
    .find((item): item is string => Boolean(item));

  if (!systolic || !diastolic) return null;
  return maybeAppendMetricUnit(`${systolic}/${diastolic}`, unit || "mmHg");
}

export function resolveMetricDisplayValue(row: NhisDataRow): string | null {
  const metric = primitiveToText(asPrimitiveOrUndefined(row.metric)) ?? "";
  const unit = resolveMetricUnitText(row);

  if (CHECKUP_BLOOD_PRESSURE_METRIC_PATTERN.test(metric)) {
    return resolveBloodPressureValue(row, unit);
  }

  const candidates = [row.itemData, row.value, row.result]
    .map((item) => toDisplayText(item))
    .filter((item): item is string => Boolean(item))
    .filter(
      (item) => !CHECKUP_METRIC_BP_INCOMPLETE_PATTERN.test(normalizeCompactText(item))
    );

  const numericCandidate = candidates.find(
    (item) => hasMetricNumericToken(item) && !isUnitOnlyMetricText(item)
  );
  if (numericCandidate) {
    return maybeAppendMetricUnit(numericCandidate, unit);
  }

  const fallbackCandidate = candidates.find((item) => !isUnitOnlyMetricText(item));
  if (fallbackCandidate) return fallbackCandidate;

  return null;
}

function pickFirstText(row: NhisDataRow, keys: string[]) {
  for (const key of keys) {
    const text = primitiveToText(asPrimitiveOrUndefined(row[key]));
    if (text) return text;
  }
  return null;
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

export {
  extractLatestCheckupMeta,
  selectLatestCheckupRows,
} from "./utils-checkup-meta";
export type { LatestCheckupMeta } from "./utils-checkup-meta";
export { summarizeMedicationRows } from "./utils-medication-digest";
export type { MedicationDigest } from "./utils-medication-digest";
