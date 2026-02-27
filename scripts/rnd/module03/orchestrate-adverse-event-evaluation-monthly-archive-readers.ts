import fs from "node:fs";
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonEmptyString,
  isPlainObject,
  normalizeIsoDate,
  readJsonFile,
  type Module03ArchiveLatest,
  type Module03ArchiveLatestEntry,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";

function parseArchiveLatestEntry(rawEntry: unknown): Module03ArchiveLatestEntry {
  if (!isPlainObject(rawEntry)) {
    throw new Error("latest.entry must be an object.");
  }

  return {
    month: assertNonEmptyString(rawEntry.month, "latest.entry.month"),
    archivedAt: normalizeIsoDate(
      assertNonEmptyString(rawEntry.archivedAt, "latest.entry.archivedAt"),
      "latest.entry.archivedAt"
    ),
    evaluatedAt: normalizeIsoDate(
      assertNonEmptyString(rawEntry.evaluatedAt, "latest.entry.evaluatedAt"),
      "latest.entry.evaluatedAt"
    ),
    windowStart: normalizeIsoDate(
      assertNonEmptyString(rawEntry.windowStart, "latest.entry.windowStart"),
      "latest.entry.windowStart"
    ),
    windowEnd: normalizeIsoDate(
      assertNonEmptyString(rawEntry.windowEnd, "latest.entry.windowEnd"),
      "latest.entry.windowEnd"
    ),
    sourceRowCount: assertFiniteNumber(rawEntry.sourceRowCount, "latest.entry.sourceRowCount"),
    countedEventCount: assertFiniteNumber(
      rawEntry.countedEventCount,
      "latest.entry.countedEventCount"
    ),
    targetMaxCountPerYear: assertFiniteNumber(
      rawEntry.targetMaxCountPerYear,
      "latest.entry.targetMaxCountPerYear"
    ),
    targetSatisfied: assertBoolean(rawEntry.targetSatisfied, "latest.entry.targetSatisfied"),
    inputPath: assertNonEmptyString(rawEntry.inputPath, "latest.entry.inputPath"),
    schemaMapPath:
      rawEntry.schemaMapPath === null
        ? null
        : assertNonEmptyString(rawEntry.schemaMapPath, "latest.entry.schemaMapPath"),
    reportPath: assertNonEmptyString(rawEntry.reportPath, "latest.entry.reportPath"),
  };
}

export function readArchiveLatest(
  latestPath: string,
  expectedIdentity: {
    moduleId: Module03ArchiveLatest["module"];
    kpiId: Module03ArchiveLatest["kpiId"];
  }
): Module03ArchiveLatest {
  if (!fs.existsSync(latestPath)) {
    throw new Error(`Archive latest file does not exist: ${latestPath}`);
  }
  const raw = readJsonFile(latestPath);
  if (!isPlainObject(raw)) {
    throw new Error(`Archive latest file must be an object: ${latestPath}`);
  }

  const moduleId = assertNonEmptyString(raw.module, "latest.module");
  const phase = assertNonEmptyString(raw.phase, "latest.phase");
  const kpiId = assertNonEmptyString(raw.kpiId, "latest.kpiId");
  const artifact = assertNonEmptyString(raw.artifact, "latest.artifact");
  if (moduleId !== expectedIdentity.moduleId) {
    throw new Error(
      `latest.module must be "${expectedIdentity.moduleId}", received "${moduleId}".`
    );
  }
  if (phase !== "EVALUATION") {
    throw new Error(`latest.phase must be "EVALUATION", received "${phase}".`);
  }
  if (kpiId !== expectedIdentity.kpiId) {
    throw new Error(`latest.kpiId must be "${expectedIdentity.kpiId}", received "${kpiId}".`);
  }
  if (artifact !== "monthly_archive_latest") {
    throw new Error(
      `latest.artifact must be "monthly_archive_latest", received "${artifact}".`
    );
  }

  return {
    module: expectedIdentity.moduleId,
    phase: "EVALUATION",
    kpiId: expectedIdentity.kpiId,
    artifact: "monthly_archive_latest",
    generatedAt: normalizeIsoDate(
      assertNonEmptyString(raw.generatedAt, "latest.generatedAt"),
      "latest.generatedAt"
    ),
    entry: parseArchiveLatestEntry(raw.entry),
  };
}

export function readArchiveManifestEntryCount(manifestPath: string): number {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Archive manifest file does not exist: ${manifestPath}`);
  }
  const raw = readJsonFile(manifestPath);
  if (!isPlainObject(raw)) {
    throw new Error(`Archive manifest must be an object: ${manifestPath}`);
  }
  if (!Array.isArray(raw.entries)) {
    throw new Error(`Archive manifest entries must be an array: ${manifestPath}`);
  }
  return raw.entries.length;
}
