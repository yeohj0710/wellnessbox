import type {
  RndModule04EvaluationInput,
  RndModule04ExclusionReason,
  RndModule04MetricContribution,
  RndModule04NormalizationRule,
  RndModule04UserResult,
} from "./contracts";

export type ContributionDraft = {
  metricKey: string;
  preZ: number;
  postZ: number;
  deltaZ: number;
  improvementPp: number;
};

export type ExclusionDraft = {
  reason: RndModule04ExclusionReason;
  detail: string;
};

export type MeasurementWindow = {
  startAt: string;
  endAt: string;
};

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function erfApprox(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-(x * x));
  return sign * y;
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

function compactIso(isoDateTime: string): string {
  return isoDateTime.replace(/[^0-9]/g, "");
}

export function buildDeterministicRunId(generatedAt: string): string {
  return `rnd04-mvp-run-${compactIso(generatedAt).slice(0, 14)}`;
}

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildMeasurementWindow(
  inputs: RndModule04EvaluationInput[],
  period: "pre" | "post",
  fallback: string
): MeasurementWindow {
  const timestamps = inputs
    .flatMap((input) => input.measurements)
    .filter((measurement) => measurement.period === period)
    .map((measurement) => Date.parse(measurement.measuredAt))
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return { startAt: fallback, endAt: fallback };
  }

  const startAt = new Date(Math.min(...timestamps)).toISOString();
  const endAt = new Date(Math.max(...timestamps)).toISOString();
  return { startAt, endAt };
}

export function buildRuleMap(
  rules: RndModule04NormalizationRule[]
): Map<string, RndModule04NormalizationRule> {
  const map = new Map<string, RndModule04NormalizationRule>();
  for (const rule of rules) {
    const key = normalizeToken(rule.metricKey);
    if (map.has(key)) {
      throw new Error(`Duplicate normalization rule metricKey: ${rule.metricKey}`);
    }
    map.set(key, rule);
  }
  return map;
}

function toNormalizedZScore(rawValue: number, rule: RndModule04NormalizationRule): number {
  const rawZ = (rawValue - rule.baselineMean) / rule.baselineStdDev;
  return rule.higherIsBetter ? rawZ : rawZ * -1;
}

export function evaluateInputContributions(
  input: RndModule04EvaluationInput,
  ruleMap: Map<string, RndModule04NormalizationRule>,
  outlierZThreshold: number
): { contributions: ContributionDraft[]; exclusion: ExclusionDraft | null } {
  const preMeasurements = input.measurements.filter((measurement) => measurement.period === "pre");
  const postMeasurements = input.measurements.filter(
    (measurement) => measurement.period === "post"
  );

  if (preMeasurements.length === 0) {
    return {
      contributions: [],
      exclusion: { reason: "missing_pre", detail: "No pre-period measurements found." },
    };
  }
  if (postMeasurements.length === 0) {
    return {
      contributions: [],
      exclusion: { reason: "missing_post", detail: "No post-period measurements found." },
    };
  }

  const metricKeys = new Set(
    input.measurements
      .map((measurement) => normalizeToken(measurement.metricKey))
      .filter((metricKey) => ruleMap.has(metricKey))
  );

  const contributions: ContributionDraft[] = [];
  let hasPreGap = false;
  let hasPostGap = false;

  for (const metricKey of metricKeys) {
    const rule = ruleMap.get(metricKey);
    if (!rule) continue;

    const preValues = preMeasurements
      .filter((measurement) => normalizeToken(measurement.metricKey) === metricKey)
      .map((measurement) => measurement.rawValue);
    const postValues = postMeasurements
      .filter((measurement) => normalizeToken(measurement.metricKey) === metricKey)
      .map((measurement) => measurement.rawValue);

    if (preValues.length === 0) {
      hasPreGap = true;
      continue;
    }
    if (postValues.length === 0) {
      hasPostGap = true;
      continue;
    }

    const preZ = toNormalizedZScore(average(preValues), rule);
    const postZ = toNormalizedZScore(average(postValues), rule);

    if (Math.abs(preZ) > outlierZThreshold || Math.abs(postZ) > outlierZThreshold) {
      return {
        contributions: [],
        exclusion: {
          reason: "outlier",
          detail: `Metric ${rule.metricKey} exceeded z-threshold ${outlierZThreshold}.`,
        },
      };
    }

    const deltaZ = postZ - preZ;
    const improvementPp = (normalCdf(postZ) - normalCdf(preZ)) * 100;
    contributions.push({
      metricKey: rule.metricKey,
      preZ: roundTo(preZ, 4),
      postZ: roundTo(postZ, 4),
      deltaZ: roundTo(deltaZ, 4),
      improvementPp: roundTo(improvementPp, 4),
    });
  }

  if (contributions.length === 0) {
    if (hasPreGap && !hasPostGap) {
      return {
        contributions: [],
        exclusion: {
          reason: "missing_pre",
          detail: "Required pre-period measurements missing for normalized metrics.",
        },
      };
    }
    return {
      contributions: [],
      exclusion: {
        reason: "missing_post",
        detail: "Required post-period measurements missing for normalized metrics.",
      },
    };
  }

  return { contributions, exclusion: null };
}

export function buildUserResult(
  input: RndModule04EvaluationInput,
  contributions: ContributionDraft[],
  generatedAt: string,
  index: number
): RndModule04UserResult {
  const preScore = average(contributions.map((item) => item.preZ));
  const postScore = average(contributions.map((item) => item.postZ));
  const deltaScore = postScore - preScore;
  const improvementPp = (normalCdf(postScore) - normalCdf(preScore)) * 100;

  const metricContributions: RndModule04MetricContribution[] = contributions.map((item) => ({
    metricKey: item.metricKey,
    preZ: item.preZ,
    postZ: item.postZ,
    deltaZ: item.deltaZ,
    improvementPp: item.improvementPp,
  }));

  return {
    resultId: `rnd04-result-${String(index + 1).padStart(4, "0")}`,
    evaluationId: input.evaluationId,
    appUserIdHash: input.profile.appUserIdHash,
    preScore: roundTo(preScore, 4),
    postScore: roundTo(postScore, 4),
    deltaScore: roundTo(deltaScore, 4),
    improvementPp: roundTo(improvementPp, 4),
    metricContributions,
    computedAt: generatedAt,
  };
}
