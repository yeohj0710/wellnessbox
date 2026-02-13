// RND: Module 02 Data Lake MVP persistence using existing Config storage.

import db from "../../db";
import {
  assertRndDataLakeRecord,
  assertRndEvidenceLinkLog,
  type RndDataLakeRecord,
  type RndEvidenceLinkLog,
} from "./contracts";
import {
  assertModule02ScaffoldBundle,
  type Module02ScaffoldBundle,
} from "./scaffold";

const MODULE02_MVP_PREFIX = "rnd:module02:mvp:v1";
const MODULE02_MVP_RECORD_PREFIX = `${MODULE02_MVP_PREFIX}:record:`;
const MODULE02_MVP_EVIDENCE_PREFIX = `${MODULE02_MVP_PREFIX}:evidence:`;
const MODULE02_MVP_SUMMARY_KEY = `${MODULE02_MVP_PREFIX}:summary:latest`;

type PersistedRecordEnvelope = {
  kind: "record";
  record: RndDataLakeRecord;
  persistedAt: string;
};

type PersistedEvidenceEnvelope = {
  kind: "evidence_link_log";
  log: RndEvidenceLinkLog;
  persistedAt: string;
};

type PersistedSummaryEnvelope = {
  kind: "summary";
  generatedAt: string;
  persistedAt: string;
  recordCount: number;
  evidenceLinkLogCount: number;
};

export type PersistModule02BundleResult = {
  persistedAt: string;
  generatedAt: string;
  recordCount: number;
  evidenceLinkLogCount: number;
  summaryKey: string;
  recordKeys: string[];
  evidenceLogKeys: string[];
};

function normalizeKeyPart(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || "na";
}

function buildRecordKey(recordId: string): string {
  return `${MODULE02_MVP_RECORD_PREFIX}${normalizeKeyPart(recordId)}`;
}

function buildEvidenceKey(log: RndEvidenceLinkLog): string {
  return `${MODULE02_MVP_EVIDENCE_PREFIX}${normalizeKeyPart(log.sampleId)}:${normalizeKeyPart(log.queryId)}`;
}

function parseJsonValue(raw: string, key: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid JSON stored for key: ${key}`);
  }
}

function isPersistedSummaryEnvelope(value: unknown): value is PersistedSummaryEnvelope {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.kind === "summary" &&
    typeof payload.generatedAt === "string" &&
    typeof payload.persistedAt === "string" &&
    typeof payload.recordCount === "number" &&
    typeof payload.evidenceLinkLogCount === "number"
  );
}

function toRecordEnvelope(
  record: RndDataLakeRecord,
  persistedAt: string
): PersistedRecordEnvelope {
  return {
    kind: "record",
    record,
    persistedAt,
  };
}

function toEvidenceEnvelope(
  log: RndEvidenceLinkLog,
  persistedAt: string
): PersistedEvidenceEnvelope {
  return {
    kind: "evidence_link_log",
    log,
    persistedAt,
  };
}

export async function persistModule02BundleMvp(
  bundle: Module02ScaffoldBundle
): Promise<PersistModule02BundleResult> {
  assertModule02ScaffoldBundle(bundle);

  const persistedAt = new Date().toISOString();
  const recordKeys = bundle.records.map((record) => buildRecordKey(record.recordId));
  const evidenceLogKeys = bundle.evidenceLinkLogs.map((log) => buildEvidenceKey(log));

  await db.$transaction(async (tx) => {
    for (let i = 0; i < bundle.records.length; i += 1) {
      const record = bundle.records[i];
      assertRndDataLakeRecord(record);
      const key = recordKeys[i];
      const value = JSON.stringify(toRecordEnvelope(record, persistedAt));
      await tx.config.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    for (let i = 0; i < bundle.evidenceLinkLogs.length; i += 1) {
      const log = bundle.evidenceLinkLogs[i];
      assertRndEvidenceLinkLog(log);
      const key = evidenceLogKeys[i];
      const value = JSON.stringify(toEvidenceEnvelope(log, persistedAt));
      await tx.config.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const summary: PersistedSummaryEnvelope = {
      kind: "summary",
      generatedAt: bundle.generatedAt,
      persistedAt,
      recordCount: bundle.records.length,
      evidenceLinkLogCount: bundle.evidenceLinkLogs.length,
    };

    await tx.config.upsert({
      where: { key: MODULE02_MVP_SUMMARY_KEY },
      update: { value: JSON.stringify(summary) },
      create: { key: MODULE02_MVP_SUMMARY_KEY, value: JSON.stringify(summary) },
    });
  });

  return {
    persistedAt,
    generatedAt: bundle.generatedAt,
    recordCount: bundle.records.length,
    evidenceLinkLogCount: bundle.evidenceLinkLogs.length,
    summaryKey: MODULE02_MVP_SUMMARY_KEY,
    recordKeys,
    evidenceLogKeys,
  };
}

export async function loadModule02BundleMvp(): Promise<Module02ScaffoldBundle | null> {
  const rows = await db.config.findMany({
    where: { key: { startsWith: MODULE02_MVP_PREFIX } },
    orderBy: { key: "asc" },
  });

  if (rows.length === 0) return null;

  const records: RndDataLakeRecord[] = [];
  const evidenceLinkLogs: RndEvidenceLinkLog[] = [];
  let generatedAt: string | null = null;

  for (const row of rows) {
    const parsed = parseJsonValue(row.value, row.key);

    if (row.key === MODULE02_MVP_SUMMARY_KEY) {
      if (isPersistedSummaryEnvelope(parsed)) {
        generatedAt = parsed.generatedAt;
      }
      continue;
    }

    if (row.key.startsWith(MODULE02_MVP_RECORD_PREFIX)) {
      const envelope = parsed as Partial<PersistedRecordEnvelope>;
      const record = envelope.record ?? parsed;
      assertRndDataLakeRecord(record);
      records.push(record);
      continue;
    }

    if (row.key.startsWith(MODULE02_MVP_EVIDENCE_PREFIX)) {
      const envelope = parsed as Partial<PersistedEvidenceEnvelope>;
      const log = envelope.log ?? parsed;
      assertRndEvidenceLinkLog(log);
      evidenceLinkLogs.push(log);
    }
  }

  if (records.length === 0 || evidenceLinkLogs.length === 0) return null;

  return {
    generatedAt: generatedAt ?? records[0].collectedAt,
    records,
    evidenceLinkLogs,
  };
}
