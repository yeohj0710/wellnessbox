import fs from "node:fs";
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonEmptyString,
  isPlainObject,
  normalizeIsoDate,
  readJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  KPI_ID,
  MODULE_ID,
  type Module03Kpi06ArchiveEntry,
  type Module03Kpi06ArchiveManifest,
  type Module03Kpi06OpsOutput,
} from "./monthly-archive-types";

function assertOpsOutputIdentity(raw: Record<string, unknown>): void {
  const moduleId = assertNonEmptyString(raw.module, "output.module");
  const phase = assertNonEmptyString(raw.phase, "output.phase");
  const kpiId = assertNonEmptyString(raw.kpiId, "output.kpiId");
  if (moduleId !== MODULE_ID) {
    throw new Error(`Unexpected module in ops output: ${moduleId}`);
  }
  if (phase !== "EVALUATION") {
    throw new Error(`Unexpected phase in ops output: ${phase}`);
  }
  if (kpiId !== KPI_ID) {
    throw new Error(`Unexpected KPI ID in ops output: ${kpiId}`);
  }
}

function parseOpsOutputReport(
  report: Record<string, unknown>
): Module03Kpi06OpsOutput["report"] {
  const reportWindowStart = assertNonEmptyString(
    report.windowStart,
    "output.report.windowStart"
  );
  const reportWindowEnd = assertNonEmptyString(report.windowEnd, "output.report.windowEnd");

  return {
    windowStart: normalizeIsoDate(reportWindowStart, "output.report.windowStart"),
    windowEnd: normalizeIsoDate(reportWindowEnd, "output.report.windowEnd"),
    countedEventCount: assertFiniteNumber(
      report.countedEventCount,
      "output.report.countedEventCount"
    ),
    targetMaxCountPerYear: assertFiniteNumber(
      report.targetMaxCountPerYear,
      "output.report.targetMaxCountPerYear"
    ),
    targetSatisfied: assertBoolean(report.targetSatisfied, "output.report.targetSatisfied"),
  };
}

export function readOpsOutput(outputPath: string): Module03Kpi06OpsOutput {
  const raw = readJsonFile(outputPath);
  if (!isPlainObject(raw)) {
    throw new Error(`Ops output at ${outputPath} must be a JSON object.`);
  }
  assertOpsOutputIdentity(raw);

  if (!isPlainObject(raw.report)) {
    throw new Error("output.report must be a JSON object.");
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    generatedAt: normalizeIsoDate(
      assertNonEmptyString(raw.generatedAt, "output.generatedAt"),
      "output.generatedAt"
    ),
    evaluatedAt: normalizeIsoDate(
      assertNonEmptyString(raw.evaluatedAt, "output.evaluatedAt"),
      "output.evaluatedAt"
    ),
    sourceRowCount: assertFiniteNumber(raw.sourceRowCount, "output.sourceRowCount"),
    report: parseOpsOutputReport(raw.report),
  };
}

function parseArchiveEntryTimestampField(
  rawEntry: Record<string, unknown>,
  index: number,
  key: "archivedAt" | "evaluatedAt" | "windowStart" | "windowEnd"
): string {
  return normalizeIsoDate(
    assertNonEmptyString(rawEntry[key], `manifest.entries[${index}].${key}`),
    `manifest.entries[${index}].${key}`
  );
}

function parseArchiveEntryNumericField(
  rawEntry: Record<string, unknown>,
  index: number,
  key: "sourceRowCount" | "countedEventCount" | "targetMaxCountPerYear"
): number {
  return assertFiniteNumber(rawEntry[key], `manifest.entries[${index}].${key}`);
}

function parseArchiveEntry(rawEntry: unknown, index: number): Module03Kpi06ArchiveEntry {
  if (!isPlainObject(rawEntry)) {
    throw new Error(`manifest.entries[${index}] must be an object.`);
  }

  return {
    month: assertNonEmptyString(rawEntry.month, `manifest.entries[${index}].month`),
    archivedAt: parseArchiveEntryTimestampField(rawEntry, index, "archivedAt"),
    evaluatedAt: parseArchiveEntryTimestampField(rawEntry, index, "evaluatedAt"),
    windowStart: parseArchiveEntryTimestampField(rawEntry, index, "windowStart"),
    windowEnd: parseArchiveEntryTimestampField(rawEntry, index, "windowEnd"),
    sourceRowCount: parseArchiveEntryNumericField(rawEntry, index, "sourceRowCount"),
    countedEventCount: parseArchiveEntryNumericField(rawEntry, index, "countedEventCount"),
    targetMaxCountPerYear: parseArchiveEntryNumericField(
      rawEntry,
      index,
      "targetMaxCountPerYear"
    ),
    targetSatisfied: assertBoolean(
      rawEntry.targetSatisfied,
      `manifest.entries[${index}].targetSatisfied`
    ),
    inputPath: assertNonEmptyString(rawEntry.inputPath, `manifest.entries[${index}].inputPath`),
    schemaMapPath:
      rawEntry.schemaMapPath === null
        ? null
        : assertNonEmptyString(
            rawEntry.schemaMapPath,
            `manifest.entries[${index}].schemaMapPath`
          ),
    reportPath: assertNonEmptyString(rawEntry.reportPath, `manifest.entries[${index}].reportPath`),
  };
}

export function readArchiveManifest(
  manifestPath: string,
  archiveDir: string
): Module03Kpi06ArchiveManifest {
  if (!fs.existsSync(manifestPath)) {
    return {
      module: MODULE_ID,
      phase: "EVALUATION",
      kpiId: KPI_ID,
      artifact: "monthly_archive",
      generatedAt: new Date().toISOString(),
      archiveDir,
      entries: [],
    };
  }

  const raw = readJsonFile(manifestPath);
  if (!isPlainObject(raw)) {
    throw new Error(`Archive manifest at ${manifestPath} must be a JSON object.`);
  }

  if (!Array.isArray(raw.entries)) {
    throw new Error(`Archive manifest at ${manifestPath} must contain an entries array.`);
  }

  const entries = raw.entries.map((entry, index) => parseArchiveEntry(entry, index));

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "monthly_archive",
    generatedAt:
      typeof raw.generatedAt === "string" && raw.generatedAt.length > 0
        ? normalizeIsoDate(raw.generatedAt, "manifest.generatedAt")
        : new Date().toISOString(),
    archiveDir,
    entries,
  };
}
