const CHECKUP_CAUTION_PATTERN =
  /(이상|미달|경계|비정상|주의|고혈압|저혈압|양성|high|low|초과|미만|\+{1,})/i;
const CHECKUP_NORMAL_PATTERN = /(정상|음성|양호|negative|within range)/i;

export type NumericRange = {
  min?: number;
  max?: number;
};

type MetricRangeRule = {
  pattern: RegExp;
  range: NumericRange;
};

const CHECKUP_RANGE_RULES: MetricRangeRule[] = [
  { pattern: /(체질량지수|bmi)/i, range: { min: 16, max: 34.9 } },
  { pattern: /(허리둘레|복부둘레)/i, range: { min: 55, max: 110 } },
  { pattern: /(수축기|최고혈압)/i, range: { min: 80, max: 149 } },
  { pattern: /(이완기|최저혈압)/i, range: { min: 45, max: 99 } },
  { pattern: /(혈당|공복혈당|glucose)/i, range: { min: 55, max: 139 } },
  { pattern: /(총콜레스테롤|cholesterol)/i, range: { min: 100, max: 259 } },
  { pattern: /(중성지방|triglyceride)/i, range: { min: 10, max: 299 } },
  { pattern: /(^|\s)hdl($|\s)|고밀도/i, range: { min: 30, max: 110 } },
  { pattern: /(^|\s)ldl($|\s)|저밀도/i, range: { min: 30, max: 189 } },
  { pattern: /(^|\s)ast($|\s)|got/i, range: { min: 0, max: 60 } },
  { pattern: /(^|\s)alt($|\s)|gpt/i, range: { min: 0, max: 70 } },
  { pattern: /(감마|ggt)/i, range: { min: 0, max: 110 } },
  { pattern: /(혈색소|헤모글로빈|hemoglobin)/i, range: { min: 10, max: 19 } },
  { pattern: /(크레아티닌|creatinine)/i, range: { min: 0.4, max: 1.8 } },
  { pattern: /(egfr)/i, range: { min: 45, max: 200 } },
];

export function isCheckupCautionText(text: string) {
  return CHECKUP_CAUTION_PATTERN.test(text);
}

export function isCheckupNormalText(text: string) {
  return CHECKUP_NORMAL_PATTERN.test(text);
}

export function parseNumberFromText(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBpFromText(value: string): { systolic: number; diastolic: number } | null {
  const match = value.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})/);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  return { systolic, diastolic };
}

export function parseRangeFromText(text: string | null): NumericRange | null {
  if (!text) return null;
  const normalized = text.replace(/,/g, "").replace(/\s+/g, "");

  const between = normalized.match(/(-?\d+(?:\.\d+)?)\s*[~\-]\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    const min = Number(between[1]);
    const max = Number(between[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return min <= max ? { min, max } : { min: max, max: min };
    }
  }

  const atLeast = normalized.match(/(-?\d+(?:\.\d+)?)(이상|초과|>=|>)/);
  if (atLeast) {
    const min = Number(atLeast[1]);
    if (Number.isFinite(min)) return { min };
  }

  const atMost = normalized.match(/(-?\d+(?:\.\d+)?)(이하|미만|<=|<)/);
  if (atMost) {
    const max = Number(atMost[1]);
    if (Number.isFinite(max)) return { max };
  }

  return null;
}

function findMetricRange(metric: string): NumericRange | null {
  for (const rule of CHECKUP_RANGE_RULES) {
    if (rule.pattern.test(metric)) return rule.range;
  }
  return null;
}

function evaluateRange(value: number, range: NumericRange): "normal" | "caution" {
  if (typeof range.min === "number" && value < range.min) return "caution";
  if (typeof range.max === "number" && value > range.max) return "caution";
  return "normal";
}

export function resolveToneFromMetricRange(
  metricText: string,
  resultText: string
): "normal" | "caution" | null {
  const normalizedMetric = metricText.toLowerCase();
  const bp = parseBpFromText(resultText);
  if (bp && /(혈압|pressure|bp|최고|최저|수축기|이완기)/i.test(normalizedMetric)) {
    if (bp.systolic >= 150 || bp.diastolic >= 100) return "caution";
    if (bp.systolic <= 79 || bp.diastolic <= 44) return "caution";
    return "normal";
  }

  if (/(시력|vision)/i.test(normalizedMetric)) {
    const pairs = resultText
      .split("/")
      .map((item) => parseNumberFromText(item))
      .filter((item): item is number => item !== null);
    if (pairs.length > 0) {
      return pairs.some((value) => value < 0.5) ? "caution" : "normal";
    }
  }

  const range = findMetricRange(metricText);
  if (!range) return null;
  const value = parseNumberFromText(resultText);
  if (value === null) return null;
  return evaluateRange(value, range);
}
