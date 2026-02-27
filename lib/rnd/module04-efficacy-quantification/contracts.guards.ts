import {
  RND_MODULE_04_EXCLUSION_REASONS,
  RND_MODULE_04_MEASUREMENT_KINDS,
  RND_MODULE_04_NAME,
  RND_MODULE_04_PERIODS,
  RND_MODULE_04_SCHEMA_VERSION,
  RND_MODULE_04_STANDARDIZATION_METHODS,
  type RndModule04EvaluationInput,
  type RndModule04EvaluationMeta,
  type RndModule04ExcludedCase,
  type RndModule04ExclusionReason,
  type RndModule04InterventionPlan,
  type RndModule04Measurement,
  type RndModule04MeasurementKind,
  type RndModule04MeasurementWindow,
  type RndModule04MetricContribution,
  type RndModule04NormalizationRule,
  type RndModule04Period,
  type RndModule04QuantificationOutput,
  type RndModule04StandardizationMethod,
  type RndModule04UserProfile,
  type RndModule04UserResult,
} from "@/lib/rnd/module04-efficacy-quantification/contracts.model";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRateBetweenZeroAndOne(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

export function isRndModule04MeasurementKind(
  value: unknown
): value is RndModule04MeasurementKind {
  return (
    typeof value === "string" &&
    (RND_MODULE_04_MEASUREMENT_KINDS as readonly string[]).includes(value)
  );
}

export function isRndModule04Period(value: unknown): value is RndModule04Period {
  return (
    typeof value === "string" &&
    (RND_MODULE_04_PERIODS as readonly string[]).includes(value)
  );
}

export function isRndModule04StandardizationMethod(
  value: unknown
): value is RndModule04StandardizationMethod {
  return (
    typeof value === "string" &&
    (RND_MODULE_04_STANDARDIZATION_METHODS as readonly string[]).includes(value)
  );
}

export function isRndModule04ExclusionReason(
  value: unknown
): value is RndModule04ExclusionReason {
  return (
    typeof value === "string" &&
    (RND_MODULE_04_EXCLUSION_REASONS as readonly string[]).includes(value)
  );
}

export function isRndModule04UserProfile(
  value: unknown
): value is RndModule04UserProfile {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isNonEmptyString(value.ageBand)) return false;
  if (
    value.sex !== "female" &&
    value.sex !== "male" &&
    value.sex !== "other" &&
    value.sex !== "unknown"
  ) {
    return false;
  }
  if (!isStringArray(value.healthGoals)) return false;
  if (!isStringArray(value.baselineConditions)) return false;
  return true;
}

export function isRndModule04InterventionPlan(
  value: unknown
): value is RndModule04InterventionPlan {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.planId)) return false;
  if (!isStringArray(value.ingredientCodes) || value.ingredientCodes.length === 0) {
    return false;
  }
  if (!isIsoDateTime(value.startedAt)) return false;
  if (!isIsoDateTime(value.endedAt)) return false;
  if (!isPositiveInteger(value.dailyDoseCount)) return false;
  if (!isRateBetweenZeroAndOne(value.adherenceRate)) return false;
  return true;
}

export function isRndModule04Measurement(
  value: unknown
): value is RndModule04Measurement {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.measurementId)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isRndModule04MeasurementKind(value.metricKind)) return false;
  if (!isNonEmptyString(value.unit)) return false;
  if (!isRndModule04Period(value.period)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  if (!isFiniteNumber(value.rawValue)) return false;
  return true;
}

export function isRndModule04EvaluationInput(
  value: unknown
): value is RndModule04EvaluationInput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evaluationId)) return false;
  if (value.module !== RND_MODULE_04_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_04_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isRndModule04UserProfile(value.profile)) return false;
  if (!isRndModule04InterventionPlan(value.intervention)) return false;
  if (!Array.isArray(value.measurements) || value.measurements.length === 0) return false;
  if (!value.measurements.every((measurement) => isRndModule04Measurement(measurement))) {
    return false;
  }
  const periods = new Set(value.measurements.map((measurement) => measurement.period));
  if (!periods.has("pre") || !periods.has("post")) return false;
  return true;
}

export function assertRndModule04EvaluationInput(
  value: unknown
): asserts value is RndModule04EvaluationInput {
  if (!isRndModule04EvaluationInput(value)) {
    throw new Error("Invalid Module 04 evaluation input payload.");
  }
}

export function isRndModule04NormalizationRule(
  value: unknown
): value is RndModule04NormalizationRule {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.ruleId)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isRndModule04StandardizationMethod(value.method)) return false;
  if (!isFiniteNumber(value.baselineMean)) return false;
  if (!isFiniteNumber(value.baselineStdDev) || value.baselineStdDev <= 0) return false;
  if (typeof value.higherIsBetter !== "boolean") return false;
  if (!isNonEmptyString(value.version)) return false;
  return true;
}

export function assertRndModule04NormalizationRule(
  value: unknown
): asserts value is RndModule04NormalizationRule {
  if (!isRndModule04NormalizationRule(value)) {
    throw new Error("Invalid Module 04 normalization rule payload.");
  }
}

function isRndModule04MetricContribution(
  value: unknown
): value is RndModule04MetricContribution {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isFiniteNumber(value.preZ)) return false;
  if (!isFiniteNumber(value.postZ)) return false;
  if (!isFiniteNumber(value.deltaZ)) return false;
  if (!isFiniteNumber(value.improvementPp)) return false;
  return true;
}

export function isRndModule04UserResult(
  value: unknown
): value is RndModule04UserResult {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.resultId)) return false;
  if (!isNonEmptyString(value.evaluationId)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isFiniteNumber(value.preScore)) return false;
  if (!isFiniteNumber(value.postScore)) return false;
  if (!isFiniteNumber(value.deltaScore)) return false;
  if (!isFiniteNumber(value.improvementPp)) return false;
  if (!Array.isArray(value.metricContributions) || value.metricContributions.length === 0) {
    return false;
  }
  if (
    !value.metricContributions.every((contribution) =>
      isRndModule04MetricContribution(contribution)
    )
  ) {
    return false;
  }
  if (!isIsoDateTime(value.computedAt)) return false;
  return true;
}

export function assertRndModule04UserResult(
  value: unknown
): asserts value is RndModule04UserResult {
  if (!isRndModule04UserResult(value)) {
    throw new Error("Invalid Module 04 user result payload.");
  }
}

export function isRndModule04ExcludedCase(
  value: unknown
): value is RndModule04ExcludedCase {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evaluationId)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isRndModule04ExclusionReason(value.reason)) return false;
  if (!isNonEmptyString(value.detail)) return false;
  if (!isIsoDateTime(value.recordedAt)) return false;
  return true;
}

export function assertRndModule04ExcludedCase(
  value: unknown
): asserts value is RndModule04ExcludedCase {
  if (!isRndModule04ExcludedCase(value)) {
    throw new Error("Invalid Module 04 excluded-case payload.");
  }
}

function isRndModule04MeasurementWindow(
  value: unknown
): value is RndModule04MeasurementWindow {
  if (!isObject(value)) return false;
  if (!isIsoDateTime(value.startAt)) return false;
  if (!isIsoDateTime(value.endAt)) return false;
  return true;
}

export function isRndModule04EvaluationMeta(
  value: unknown
): value is RndModule04EvaluationMeta {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.datasetVersion)) return false;
  if (!isNonEmptyString(value.normalizationVersion)) return false;
  if (!isRndModule04MeasurementWindow(value.preWindow)) return false;
  if (!isRndModule04MeasurementWindow(value.postWindow)) return false;
  if (!isPositiveInteger(value.minMeasurementsPerPeriod)) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  return true;
}

export function assertRndModule04EvaluationMeta(
  value: unknown
): asserts value is RndModule04EvaluationMeta {
  if (!isRndModule04EvaluationMeta(value)) {
    throw new Error("Invalid Module 04 evaluation meta payload.");
  }
}

export function isRndModule04QuantificationOutput(
  value: unknown
): value is RndModule04QuantificationOutput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evaluationRunId)) return false;
  if (value.module !== RND_MODULE_04_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_04_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  if (!isNonNegativeInteger(value.includedUserCount)) return false;
  if (!isNonNegativeInteger(value.excludedUserCount)) return false;
  if (!isFiniteNumber(value.averageImprovementPp)) return false;
  if (!Array.isArray(value.userResults)) return false;
  if (!value.userResults.every((result) => isRndModule04UserResult(result))) return false;
  if (!Array.isArray(value.excludedCases)) return false;
  if (!value.excludedCases.every((excluded) => isRndModule04ExcludedCase(excluded))) {
    return false;
  }
  if (!isRndModule04EvaluationMeta(value.meta)) return false;
  if (value.includedUserCount !== value.userResults.length) return false;
  if (value.excludedUserCount !== value.excludedCases.length) return false;
  return true;
}

export function assertRndModule04QuantificationOutput(
  value: unknown
): asserts value is RndModule04QuantificationOutput {
  if (!isRndModule04QuantificationOutput(value)) {
    throw new Error("Invalid Module 04 quantification output payload.");
  }
}
