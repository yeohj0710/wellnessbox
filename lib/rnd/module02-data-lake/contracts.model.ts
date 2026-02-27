// RND: Module 02 Data Lake scaffold contracts.

export const RND_MODULE_02_NAME = "02_data_lake" as const;
export const RND_MODULE_02_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_02_SOURCE_KINDS = [
  "literature",
  "medical_database",
  "public_safety",
  "internal_profile",
  "internal_behavior",
  "internal_interaction",
  "internal_compute_result",
] as const;

export type RndModule02SourceKind = (typeof RND_MODULE_02_SOURCE_KINDS)[number];

export type RndDataSensitivity = "public" | "internal" | "sensitive";

export type RndEvidenceChunkRef = {
  unitId: string;
  locator: string;
};

export type RndEvidenceUnit = {
  evidenceId: string;
  sourceKind: RndModule02SourceKind;
  sourceRef: string;
  chunk: RndEvidenceChunkRef;
  capturedAt: string;
};

export type RndLineageStepName =
  | "ingest"
  | "split"
  | "tag"
  | "index"
  | "retrieve"
  | "decision";

export type RndLineageStep = {
  step: RndLineageStepName;
  actor: string;
  occurredAt: string;
  inputIds: string[];
};

export type RndDataLakeRecord<
  TPayload extends Record<string, unknown> = Record<string, unknown>
> = {
  recordId: string;
  module: typeof RND_MODULE_02_NAME;
  schemaVersion: typeof RND_MODULE_02_SCHEMA_VERSION;
  sourceKind: RndModule02SourceKind;
  sensitivity: RndDataSensitivity;
  collectedAt: string;
  payload: TPayload;
  evidence: RndEvidenceUnit[];
  lineage: RndLineageStep[];
};

export type RndEvidenceLinkLog = {
  sampleId: string;
  queryId: string;
  linkedEvidenceIds: string[];
  sourceKinds: RndModule02SourceKind[];
  lineagePath: string[];
  loggedAt: string;
};

type CreateRndDataLakeRecordInput<TPayload extends Record<string, unknown>> = {
  recordId?: string;
  sourceKind: RndModule02SourceKind;
  sensitivity: RndDataSensitivity;
  collectedAt?: string;
  payload: TPayload;
  evidence: RndEvidenceUnit[];
  lineage: RndLineageStep[];
};

function normalizeForId(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || "na";
}

export function buildRnd02RecordId(
  sourceKind: RndModule02SourceKind,
  seed: string
): string {
  return `rnd02-${normalizeForId(sourceKind)}-${normalizeForId(seed)}`;
}

export function createRndDataLakeRecord<
  TPayload extends Record<string, unknown>
>(input: CreateRndDataLakeRecordInput<TPayload>): RndDataLakeRecord<TPayload> {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const seed = collectedAt.replace(/[^0-9]/g, "");

  return {
    recordId: input.recordId ?? buildRnd02RecordId(input.sourceKind, seed),
    module: RND_MODULE_02_NAME,
    schemaVersion: RND_MODULE_02_SCHEMA_VERSION,
    sourceKind: input.sourceKind,
    sensitivity: input.sensitivity,
    collectedAt,
    payload: input.payload,
    evidence: input.evidence,
    lineage: input.lineage,
  };
}
