// RND: Module 04 Efficacy Quantification Model scaffold contracts.

export const RND_MODULE_04_NAME = "04_efficacy_quantification_model" as const;
export const RND_MODULE_04_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_04_MEASUREMENT_KINDS = [
  "survey",
  "biomarker",
  "device",
] as const;

export const RND_MODULE_04_PERIODS = ["pre", "post"] as const;

export const RND_MODULE_04_STANDARDIZATION_METHODS = ["z_score"] as const;

export const RND_MODULE_04_EXCLUSION_REASONS = [
  "missing_pre",
  "missing_post",
  "low_adherence",
  "outlier",
] as const;

export type RndModule04MeasurementKind =
  (typeof RND_MODULE_04_MEASUREMENT_KINDS)[number];
export type RndModule04Period = (typeof RND_MODULE_04_PERIODS)[number];
export type RndModule04StandardizationMethod =
  (typeof RND_MODULE_04_STANDARDIZATION_METHODS)[number];
export type RndModule04ExclusionReason =
  (typeof RND_MODULE_04_EXCLUSION_REASONS)[number];

export type RndModule04UserProfile = {
  appUserIdHash: string;
  ageBand: string;
  sex: "female" | "male" | "other" | "unknown";
  healthGoals: string[];
  baselineConditions: string[];
};

export type RndModule04InterventionPlan = {
  planId: string;
  ingredientCodes: string[];
  startedAt: string;
  endedAt: string;
  dailyDoseCount: number;
  adherenceRate: number;
};

export type RndModule04Measurement = {
  measurementId: string;
  metricKey: string;
  metricKind: RndModule04MeasurementKind;
  unit: string;
  period: RndModule04Period;
  measuredAt: string;
  rawValue: number;
};

export type RndModule04EvaluationInput = {
  evaluationId: string;
  module: typeof RND_MODULE_04_NAME;
  schemaVersion: typeof RND_MODULE_04_SCHEMA_VERSION;
  capturedAt: string;
  profile: RndModule04UserProfile;
  intervention: RndModule04InterventionPlan;
  measurements: RndModule04Measurement[];
};

export type RndModule04NormalizationRule = {
  ruleId: string;
  metricKey: string;
  method: RndModule04StandardizationMethod;
  baselineMean: number;
  baselineStdDev: number;
  higherIsBetter: boolean;
  version: string;
};

export type RndModule04MetricContribution = {
  metricKey: string;
  preZ: number;
  postZ: number;
  deltaZ: number;
  improvementPp: number;
};

export type RndModule04UserResult = {
  resultId: string;
  evaluationId: string;
  appUserIdHash: string;
  preScore: number;
  postScore: number;
  deltaScore: number;
  improvementPp: number;
  metricContributions: RndModule04MetricContribution[];
  computedAt: string;
};

export type RndModule04ExcludedCase = {
  evaluationId: string;
  appUserIdHash: string;
  reason: RndModule04ExclusionReason;
  detail: string;
  recordedAt: string;
};

export type RndModule04MeasurementWindow = {
  startAt: string;
  endAt: string;
};

export type RndModule04EvaluationMeta = {
  datasetVersion: string;
  normalizationVersion: string;
  preWindow: RndModule04MeasurementWindow;
  postWindow: RndModule04MeasurementWindow;
  minMeasurementsPerPeriod: number;
  generatedAt: string;
};

export type RndModule04QuantificationOutput = {
  evaluationRunId: string;
  module: typeof RND_MODULE_04_NAME;
  schemaVersion: typeof RND_MODULE_04_SCHEMA_VERSION;
  generatedAt: string;
  includedUserCount: number;
  excludedUserCount: number;
  averageImprovementPp: number;
  userResults: RndModule04UserResult[];
  excludedCases: RndModule04ExcludedCase[];
  meta: RndModule04EvaluationMeta;
};
