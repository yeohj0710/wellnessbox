// RND: Module 07 Biosensor and genetic integration scaffold contracts.

export const RND_MODULE_07_NAME =
  "07_biosensor_and_genetic_data_integration" as const;
export const RND_MODULE_07_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_07_DATA_SOURCES = [
  "wearable",
  "continuous_glucose",
  "genetic_test",
] as const;

export const RND_MODULE_07_SESSION_STATUSES = [
  "success",
  "partial",
  "failed",
] as const;

export const RND_MODULE_07_WEARABLE_CATEGORIES = [
  "activity",
  "heart_rate",
  "sleep",
] as const;

export const RND_MODULE_07_CGM_CATEGORIES = ["glucose"] as const;

export const RND_MODULE_07_RISK_LEVELS = ["low", "medium", "high"] as const;

export const RND_MODULE_07_ADJUSTMENT_KINDS = [
  "constraint",
  "weight",
  "personal_parameter",
] as const;

export type RndModule07DataSource = (typeof RND_MODULE_07_DATA_SOURCES)[number];
export type RndModule07SessionStatus =
  (typeof RND_MODULE_07_SESSION_STATUSES)[number];
export type RndModule07WearableCategory =
  (typeof RND_MODULE_07_WEARABLE_CATEGORIES)[number];
export type RndModule07CgmCategory = (typeof RND_MODULE_07_CGM_CATEGORIES)[number];
export type RndModule07RiskLevel = (typeof RND_MODULE_07_RISK_LEVELS)[number];
export type RndModule07AdjustmentKind =
  (typeof RND_MODULE_07_ADJUSTMENT_KINDS)[number];

export type RndModule07IntegrationSession = {
  sessionId: string;
  source: RndModule07DataSource;
  appUserIdHash: string;
  startedAt: string;
  completedAt: string;
  status: RndModule07SessionStatus;
  recordsReceived: number;
  recordsAccepted: number;
  schemaMapped: boolean;
  dataLakeRecordIds: string[];
  errorCode: string | null;
};

export type RndModule07WearableMetric = {
  metricId: string;
  sessionId: string;
  category: RndModule07WearableCategory;
  metricKey: string;
  value: number;
  unit: string;
  measuredAt: string;
};

export type RndModule07CgmMetric = {
  metricId: string;
  sessionId: string;
  category: RndModule07CgmCategory;
  metricKey: string;
  value: number;
  unit: string;
  measuredAt: string;
};

export type RndModule07GeneticVariant = {
  variantId: string;
  sessionId: string;
  gene: string;
  snpId: string;
  allele: string;
  riskLevel: RndModule07RiskLevel;
  interpretation: string;
  parameterWeightDelta: number;
  measuredAt: string;
};

export type RndModule07AlgorithmAdjustment = {
  adjustmentId: string;
  appUserIdHash: string;
  source: RndModule07DataSource;
  kind: RndModule07AdjustmentKind;
  targetKey: string;
  value: number;
  rationale: string;
  appliedAt: string;
};

export type RndModule07DataLakeWriteLog = {
  writeId: string;
  sessionId: string;
  source: RndModule07DataSource;
  dataLakeRecordId: string;
  success: boolean;
  writtenAt: string;
};

export type RndModule07SourceSummary = {
  source: RndModule07DataSource;
  totalSessions: number;
  successfulSessions: number;
  sampleCount: number;
  integrationRate: number;
};

export type RndModule07IntegrationOutput = {
  runId: string;
  module: typeof RND_MODULE_07_NAME;
  schemaVersion: typeof RND_MODULE_07_SCHEMA_VERSION;
  generatedAt: string;
  sourceSummaries: RndModule07SourceSummary[];
  overallIntegrationRate: number;
  linkedDataLakeRecordIds: string[];
};
