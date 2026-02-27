import {
  RND_MODULE_07_ADJUSTMENT_KINDS,
  RND_MODULE_07_CGM_CATEGORIES,
  RND_MODULE_07_DATA_SOURCES,
  RND_MODULE_07_NAME,
  RND_MODULE_07_RISK_LEVELS,
  RND_MODULE_07_SCHEMA_VERSION,
  RND_MODULE_07_SESSION_STATUSES,
  RND_MODULE_07_WEARABLE_CATEGORIES,
  type RndModule07AdjustmentKind,
  type RndModule07AlgorithmAdjustment,
  type RndModule07CgmCategory,
  type RndModule07CgmMetric,
  type RndModule07DataLakeWriteLog,
  type RndModule07DataSource,
  type RndModule07GeneticVariant,
  type RndModule07IntegrationOutput,
  type RndModule07IntegrationSession,
  type RndModule07RiskLevel,
  type RndModule07SessionStatus,
  type RndModule07SourceSummary,
  type RndModule07WearableCategory,
  type RndModule07WearableMetric,
} from "@/lib/rnd/module07-biosensor-genetic-integration/contracts.model";

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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRate(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

export function isRndModule07DataSource(value: unknown): value is RndModule07DataSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_DATA_SOURCES as readonly string[]).includes(value)
  );
}

export function isRndModule07SessionStatus(
  value: unknown
): value is RndModule07SessionStatus {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_SESSION_STATUSES as readonly string[]).includes(value)
  );
}

export function isRndModule07WearableCategory(
  value: unknown
): value is RndModule07WearableCategory {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_WEARABLE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isRndModule07CgmCategory(
  value: unknown
): value is RndModule07CgmCategory {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_CGM_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isRndModule07RiskLevel(value: unknown): value is RndModule07RiskLevel {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_RISK_LEVELS as readonly string[]).includes(value)
  );
}

export function isRndModule07AdjustmentKind(
  value: unknown
): value is RndModule07AdjustmentKind {
  return (
    typeof value === "string" &&
    (RND_MODULE_07_ADJUSTMENT_KINDS as readonly string[]).includes(value)
  );
}

export function isRndModule07IntegrationSession(
  value: unknown
): value is RndModule07IntegrationSession {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.sessionId)) return false;
  if (!isRndModule07DataSource(value.source)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isIsoDateTime(value.startedAt)) return false;
  if (!isIsoDateTime(value.completedAt)) return false;
  if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) return false;
  if (!isRndModule07SessionStatus(value.status)) return false;
  if (!isNonNegativeInteger(value.recordsReceived)) return false;
  if (!isNonNegativeInteger(value.recordsAccepted)) return false;
  if (value.recordsAccepted > value.recordsReceived) return false;
  if (typeof value.schemaMapped !== "boolean") return false;
  if (!isStringArray(value.dataLakeRecordIds)) return false;
  if (value.errorCode !== null && !isNonEmptyString(value.errorCode)) return false;

  if (value.status === "success") {
    if (value.recordsAccepted === 0) return false;
    if (!value.schemaMapped) return false;
    if (value.errorCode !== null) return false;
  }

  if (value.status === "failed") {
    if (value.recordsAccepted !== 0) return false;
    if (value.schemaMapped) return false;
    if (!isNonEmptyString(value.errorCode)) return false;
  }

  if (value.recordsAccepted > 0 && value.dataLakeRecordIds.length === 0) return false;
  if (value.recordsAccepted === 0 && value.dataLakeRecordIds.length > 0) return false;

  return true;
}

export function assertRndModule07IntegrationSession(
  value: unknown
): asserts value is RndModule07IntegrationSession {
  if (!isRndModule07IntegrationSession(value)) {
    throw new Error("Invalid Module 07 integration session payload.");
  }
}

export function isRndModule07WearableMetric(
  value: unknown
): value is RndModule07WearableMetric {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.metricId)) return false;
  if (!isNonEmptyString(value.sessionId)) return false;
  if (!isRndModule07WearableCategory(value.category)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isNonEmptyString(value.unit)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  return true;
}

export function assertRndModule07WearableMetric(
  value: unknown
): asserts value is RndModule07WearableMetric {
  if (!isRndModule07WearableMetric(value)) {
    throw new Error("Invalid Module 07 wearable metric payload.");
  }
}

export function isRndModule07CgmMetric(value: unknown): value is RndModule07CgmMetric {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.metricId)) return false;
  if (!isNonEmptyString(value.sessionId)) return false;
  if (!isRndModule07CgmCategory(value.category)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isNonEmptyString(value.unit)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  return true;
}

export function assertRndModule07CgmMetric(
  value: unknown
): asserts value is RndModule07CgmMetric {
  if (!isRndModule07CgmMetric(value)) {
    throw new Error("Invalid Module 07 CGM metric payload.");
  }
}

export function isRndModule07GeneticVariant(
  value: unknown
): value is RndModule07GeneticVariant {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.variantId)) return false;
  if (!isNonEmptyString(value.sessionId)) return false;
  if (!isNonEmptyString(value.gene)) return false;
  if (!isNonEmptyString(value.snpId)) return false;
  if (!isNonEmptyString(value.allele)) return false;
  if (!isRndModule07RiskLevel(value.riskLevel)) return false;
  if (!isNonEmptyString(value.interpretation)) return false;
  if (!isFiniteNumber(value.parameterWeightDelta)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  return true;
}

export function assertRndModule07GeneticVariant(
  value: unknown
): asserts value is RndModule07GeneticVariant {
  if (!isRndModule07GeneticVariant(value)) {
    throw new Error("Invalid Module 07 genetic variant payload.");
  }
}

export function isRndModule07AlgorithmAdjustment(
  value: unknown
): value is RndModule07AlgorithmAdjustment {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.adjustmentId)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isRndModule07DataSource(value.source)) return false;
  if (!isRndModule07AdjustmentKind(value.kind)) return false;
  if (!isNonEmptyString(value.targetKey)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isNonEmptyString(value.rationale)) return false;
  if (!isIsoDateTime(value.appliedAt)) return false;
  return true;
}

export function assertRndModule07AlgorithmAdjustment(
  value: unknown
): asserts value is RndModule07AlgorithmAdjustment {
  if (!isRndModule07AlgorithmAdjustment(value)) {
    throw new Error("Invalid Module 07 algorithm adjustment payload.");
  }
}

export function isRndModule07DataLakeWriteLog(
  value: unknown
): value is RndModule07DataLakeWriteLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.writeId)) return false;
  if (!isNonEmptyString(value.sessionId)) return false;
  if (!isRndModule07DataSource(value.source)) return false;
  if (!isNonEmptyString(value.dataLakeRecordId)) return false;
  if (typeof value.success !== "boolean") return false;
  if (!isIsoDateTime(value.writtenAt)) return false;
  return true;
}

export function assertRndModule07DataLakeWriteLog(
  value: unknown
): asserts value is RndModule07DataLakeWriteLog {
  if (!isRndModule07DataLakeWriteLog(value)) {
    throw new Error("Invalid Module 07 Data Lake write log payload.");
  }
}

export function isRndModule07SourceSummary(
  value: unknown
): value is RndModule07SourceSummary {
  if (!isObject(value)) return false;
  if (!isRndModule07DataSource(value.source)) return false;
  if (!isNonNegativeInteger(value.totalSessions)) return false;
  if (!isNonNegativeInteger(value.successfulSessions)) return false;
  if (value.totalSessions === 0) return false;
  if (value.successfulSessions > value.totalSessions) return false;
  if (!isNonNegativeInteger(value.sampleCount)) return false;
  if (!isRate(value.integrationRate)) return false;
  return true;
}

export function isRndModule07IntegrationOutput(
  value: unknown
): value is RndModule07IntegrationOutput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.runId)) return false;
  if (value.module !== RND_MODULE_07_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_07_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  if (!Array.isArray(value.sourceSummaries) || value.sourceSummaries.length === 0) {
    return false;
  }
  if (!value.sourceSummaries.every((summary) => isRndModule07SourceSummary(summary))) {
    return false;
  }
  if (!isRate(value.overallIntegrationRate)) return false;
  if (!isStringArray(value.linkedDataLakeRecordIds)) return false;
  return true;
}

export function assertRndModule07IntegrationOutput(
  value: unknown
): asserts value is RndModule07IntegrationOutput {
  if (!isRndModule07IntegrationOutput(value)) {
    throw new Error("Invalid Module 07 integration output payload.");
  }
}
