// RND: Module 04 Efficacy Quantification Model MVP deterministic runtime.

import {
  RND_MODULE_04_NAME,
  assertRndModule04EvaluationInput,
  assertRndModule04NormalizationRule,
  assertRndModule04QuantificationOutput,
  type RndModule04EvaluationInput,
  type RndModule04ExclusionReason,
  type RndModule04MetricContribution,
  type RndModule04NormalizationRule,
  type RndModule04QuantificationOutput,
  type RndModule04UserResult,
} from "./contracts";

const MODULE04_MVP_PHASE = "MVP" as const;
const DEFAULT_ADHERENCE_THRESHOLD = 0.7;
const DEFAULT_MIN_MEASUREMENTS_PER_PERIOD = 1;
const DEFAULT_OUTLIER_Z_THRESHOLD = 4;

export type Module04MvpRuntimeLog = {
  logId: string;
  module: typeof RND_MODULE_04_NAME;
  phase: typeof MODULE04_MVP_PHASE;
  stage: "input_validation" | "inclusion_exclusion" | "quantification" | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type RunModule04EfficacyQuantificationMvpInput = {
  evaluationInputs: RndModule04EvaluationInput[];
  normalizationRules: RndModule04NormalizationRule[];
  generatedAt?: string;
  evaluationRunId?: string;
  datasetVersion?: string;
  minMeasurementsPerPeriod?: number;
  adherenceThreshold?: number;
  outlierZThreshold?: number;
};

export type RunModule04EfficacyQuantificationMvpResult = {
  module: typeof RND_MODULE_04_NAME;
  phase: typeof MODULE04_MVP_PHASE;
  generatedAt: string;
  output: RndModule04QuantificationOutput;
  runtimeLogs: Module04MvpRuntimeLog[];
};

type ContributionDraft = {
  metricKey: string;
  preZ: number;
  postZ: number;
  deltaZ: number;
  improvementPp: number;
};

type ExclusionDraft = {
  reason: RndModule04ExclusionReason;
  detail: string;
};

type MeasurementWindow = {
  startAt: string;
  endAt: string;
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function roundTo(value: number, digits: number): number {
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

function buildDeterministicRunId(generatedAt: string): string {
  return `rnd04-mvp-run-${compactIso(generatedAt).slice(0, 14)}`;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMeasurementWindow(
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

function buildRuleMap(
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

function evaluateInputContributions(
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

function buildUserResult(
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

export function runModule04EfficacyQuantificationMvp(
  input: RunModule04EfficacyQuantificationMvpInput
): RunModule04EfficacyQuantificationMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  const adherenceThreshold = input.adherenceThreshold ?? DEFAULT_ADHERENCE_THRESHOLD;
  const minMeasurementsPerPeriod =
    input.minMeasurementsPerPeriod ?? DEFAULT_MIN_MEASUREMENTS_PER_PERIOD;
  const outlierZThreshold = input.outlierZThreshold ?? DEFAULT_OUTLIER_Z_THRESHOLD;
  const datasetVersion = input.datasetVersion ?? "rnd04-mvp-dataset-v1";

  if (!Number.isFinite(adherenceThreshold) || adherenceThreshold < 0 || adherenceThreshold > 1) {
    throw new Error("adherenceThreshold must be between 0 and 1.");
  }
  if (!Number.isInteger(minMeasurementsPerPeriod) || minMeasurementsPerPeriod <= 0) {
    throw new Error("minMeasurementsPerPeriod must be a positive integer.");
  }
  if (!Number.isFinite(outlierZThreshold) || outlierZThreshold <= 0) {
    throw new Error("outlierZThreshold must be a positive number.");
  }
  if (input.evaluationInputs.length === 0) {
    throw new Error("Module 04 MVP requires at least one evaluation input.");
  }
  if (input.normalizationRules.length === 0) {
    throw new Error("Module 04 MVP requires at least one normalization rule.");
  }

  input.evaluationInputs.forEach((item) => assertRndModule04EvaluationInput(item));
  input.normalizationRules.forEach((item) => assertRndModule04NormalizationRule(item));

  const runtimeLogs: Module04MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module04MvpRuntimeLog["stage"],
    event: string,
    details: Module04MvpRuntimeLog["details"]
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m04-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      module: RND_MODULE_04_NAME,
      phase: MODULE04_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: generatedAt,
    });
  };

  const ruleMap = buildRuleMap(input.normalizationRules);
  pushRuntimeLog("input_validation", "validated_inputs", {
    evaluationCount: input.evaluationInputs.length,
    ruleCount: input.normalizationRules.length,
    adherenceThreshold,
    minMeasurementsPerPeriod,
    outlierZThreshold,
  });

  const userResults: RndModule04UserResult[] = [];
  const excludedCases: RndModule04QuantificationOutput["excludedCases"] = [];

  for (const evaluationInput of input.evaluationInputs) {
    const preCount = evaluationInput.measurements.filter(
      (measurement) => measurement.period === "pre"
    ).length;
    const postCount = evaluationInput.measurements.filter(
      (measurement) => measurement.period === "post"
    ).length;

    let exclusion: ExclusionDraft | null = null;
    if (evaluationInput.intervention.adherenceRate < adherenceThreshold) {
      exclusion = {
        reason: "low_adherence",
        detail: `Adherence rate ${roundTo(evaluationInput.intervention.adherenceRate, 4)} is below threshold ${adherenceThreshold}.`,
      };
    } else if (preCount < minMeasurementsPerPeriod) {
      exclusion = {
        reason: "missing_pre",
        detail: `Pre-period measurement count ${preCount} is below minimum ${minMeasurementsPerPeriod}.`,
      };
    } else if (postCount < minMeasurementsPerPeriod) {
      exclusion = {
        reason: "missing_post",
        detail: `Post-period measurement count ${postCount} is below minimum ${minMeasurementsPerPeriod}.`,
      };
    }

    let contributions: ContributionDraft[] = [];
    if (!exclusion) {
      const contributionResult = evaluateInputContributions(
        evaluationInput,
        ruleMap,
        outlierZThreshold
      );
      contributions = contributionResult.contributions;
      exclusion = contributionResult.exclusion;
    }

    if (exclusion) {
      excludedCases.push({
        evaluationId: evaluationInput.evaluationId,
        appUserIdHash: evaluationInput.profile.appUserIdHash,
        reason: exclusion.reason,
        detail: exclusion.detail,
        recordedAt: generatedAt,
      });
      pushRuntimeLog("inclusion_exclusion", "excluded_case", {
        evaluationId: evaluationInput.evaluationId,
        appUserIdHash: evaluationInput.profile.appUserIdHash,
        reason: exclusion.reason,
      });
      continue;
    }

    const userResult = buildUserResult(
      evaluationInput,
      contributions,
      generatedAt,
      userResults.length
    );
    userResults.push(userResult);

    pushRuntimeLog("quantification", "quantified_case", {
      evaluationId: evaluationInput.evaluationId,
      appUserIdHash: evaluationInput.profile.appUserIdHash,
      contributionCount: contributions.length,
      improvementPp: userResult.improvementPp,
    });
  }

  const averageImprovementPp =
    userResults.length > 0
      ? roundTo(average(userResults.map((result) => result.improvementPp)), 4)
      : 0;

  const normalizationVersionSet = new Set(input.normalizationRules.map((rule) => rule.version));
  const normalizationVersion =
    normalizationVersionSet.size === 1
      ? input.normalizationRules[0].version
      : Array.from(normalizationVersionSet).sort().join(",");

  const output: RndModule04QuantificationOutput = {
    evaluationRunId: input.evaluationRunId ?? buildDeterministicRunId(generatedAt),
    module: RND_MODULE_04_NAME,
    schemaVersion: input.evaluationInputs[0].schemaVersion,
    generatedAt,
    includedUserCount: userResults.length,
    excludedUserCount: excludedCases.length,
    averageImprovementPp,
    userResults,
    excludedCases,
    meta: {
      datasetVersion,
      normalizationVersion,
      preWindow: buildMeasurementWindow(input.evaluationInputs, "pre", generatedAt),
      postWindow: buildMeasurementWindow(input.evaluationInputs, "post", generatedAt),
      minMeasurementsPerPeriod,
      generatedAt,
    },
  };
  assertRndModule04QuantificationOutput(output);

  pushRuntimeLog("output_build", "built_quantification_output", {
    includedUserCount: output.includedUserCount,
    excludedUserCount: output.excludedUserCount,
    averageImprovementPp: output.averageImprovementPp,
  });

  return {
    module: RND_MODULE_04_NAME,
    phase: MODULE04_MVP_PHASE,
    generatedAt,
    output,
    runtimeLogs,
  };
}
