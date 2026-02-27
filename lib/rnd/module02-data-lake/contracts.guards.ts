import {
  RND_MODULE_02_NAME,
  RND_MODULE_02_SCHEMA_VERSION,
  RND_MODULE_02_SOURCE_KINDS,
  type RndDataLakeRecord,
  type RndDataSensitivity,
  type RndEvidenceLinkLog,
  type RndEvidenceUnit,
  type RndLineageStep,
  type RndLineageStepName,
  type RndModule02SourceKind,
} from "@/lib/rnd/module02-data-lake/contracts.model";

const RND_DATA_SENSITIVITY_LEVELS = ["public", "internal", "sensitive"] as const;

const RND_MODULE_02_LINEAGE_STEPS = [
  "ingest",
  "split",
  "tag",
  "index",
  "retrieve",
  "decision",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isRndModule02SourceKind(
  value: unknown
): value is RndModule02SourceKind {
  return (
    typeof value === "string" &&
    (RND_MODULE_02_SOURCE_KINDS as readonly string[]).includes(value)
  );
}

function isRndLineageStepName(value: unknown): value is RndLineageStepName {
  return (
    typeof value === "string" &&
    (RND_MODULE_02_LINEAGE_STEPS as readonly string[]).includes(value)
  );
}

function isRndDataSensitivity(value: unknown): value is RndDataSensitivity {
  return (
    typeof value === "string" &&
    (RND_DATA_SENSITIVITY_LEVELS as readonly string[]).includes(value)
  );
}

export function isRndEvidenceUnit(value: unknown): value is RndEvidenceUnit {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evidenceId)) return false;
  if (!isRndModule02SourceKind(value.sourceKind)) return false;
  if (!isNonEmptyString(value.sourceRef)) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isObject(value.chunk)) return false;
  if (!isNonEmptyString(value.chunk.unitId)) return false;
  if (!isNonEmptyString(value.chunk.locator)) return false;
  return true;
}

export function isRndLineageStep(value: unknown): value is RndLineageStep {
  if (!isObject(value)) return false;
  if (!isRndLineageStepName(value.step)) return false;
  if (!isNonEmptyString(value.actor)) return false;
  if (!isIsoDateTime(value.occurredAt)) return false;
  if (!Array.isArray(value.inputIds)) return false;
  if (!value.inputIds.every((item) => isNonEmptyString(item))) return false;
  return true;
}

export function isRndDataLakeRecord(value: unknown): value is RndDataLakeRecord {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.recordId)) return false;
  if (value.module !== RND_MODULE_02_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_02_SCHEMA_VERSION) return false;
  if (!isRndModule02SourceKind(value.sourceKind)) return false;
  if (!isRndDataSensitivity(value.sensitivity)) return false;
  if (!isIsoDateTime(value.collectedAt)) return false;
  if (!isObject(value.payload)) return false;
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) return false;
  if (!value.evidence.every((item) => isRndEvidenceUnit(item))) return false;
  if (!Array.isArray(value.lineage) || value.lineage.length === 0) return false;
  if (!value.lineage.every((item) => isRndLineageStep(item))) return false;
  return true;
}

export function assertRndDataLakeRecord(
  value: unknown
): asserts value is RndDataLakeRecord {
  if (!isRndDataLakeRecord(value)) {
    throw new Error("Invalid Module 02 Data Lake record scaffold payload.");
  }
}

export function isRndEvidenceLinkLog(value: unknown): value is RndEvidenceLinkLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.sampleId)) return false;
  if (!isNonEmptyString(value.queryId)) return false;
  if (!Array.isArray(value.linkedEvidenceIds) || value.linkedEvidenceIds.length === 0) {
    return false;
  }
  if (!value.linkedEvidenceIds.every((item) => isNonEmptyString(item))) return false;
  if (!Array.isArray(value.sourceKinds) || value.sourceKinds.length === 0) return false;
  if (!value.sourceKinds.every((item) => isRndModule02SourceKind(item))) return false;
  if (!Array.isArray(value.lineagePath) || value.lineagePath.length === 0) return false;
  if (!value.lineagePath.every((item) => isNonEmptyString(item))) return false;
  if (!isIsoDateTime(value.loggedAt)) return false;
  return true;
}

export function assertRndEvidenceLinkLog(
  value: unknown
): asserts value is RndEvidenceLinkLog {
  if (!isRndEvidenceLinkLog(value)) {
    throw new Error("Invalid Module 02 evidence-link log payload.");
  }
}
