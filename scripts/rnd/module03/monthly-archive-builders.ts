import path from "node:path";
import {
  toMonthToken,
  toPathSafeTimestamp,
  toPosixPath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { applyRetentionPolicy, upsertArchiveEntry } from "./monthly-archive-retention";
import {
  MANIFEST_FILE_NAME,
  KPI_ID,
  MODULE_ID,
  type ArchiveExecutionPaths,
  type Module03Kpi06ArchiveEntry,
  type Module03Kpi06ArchiveManifest,
  type Module03Kpi06OpsOutput,
  type RetentionPolicyResult,
} from "./monthly-archive-types";

export function buildArchiveExecutionPaths(
  archiveDir: string,
  windowEnd: string
): ArchiveExecutionPaths {
  const monthToken = toMonthToken(windowEnd);
  const timestampToken = toPathSafeTimestamp(windowEnd);
  const monthArchiveDir = path.join(archiveDir, monthToken);

  return {
    monthArchiveDir,
    reportPath: path.join(
      monthArchiveDir,
      `kpi06-ops-evaluation-${timestampToken}.json`
    ),
    manifestPath: path.join(archiveDir, MANIFEST_FILE_NAME),
    latestPath: path.join(archiveDir, "latest.json"),
  };
}

export function buildArchiveEntry(
  output: Module03Kpi06OpsOutput,
  options: {
    inputPath: string;
    schemaMapPath: string | null;
    archiveDir: string;
  },
  archivedAt: string,
  reportPath: string
): Module03Kpi06ArchiveEntry {
  return {
    month: toMonthToken(output.report.windowEnd),
    archivedAt,
    evaluatedAt: output.evaluatedAt,
    windowStart: output.report.windowStart,
    windowEnd: output.report.windowEnd,
    sourceRowCount: output.sourceRowCount,
    countedEventCount: output.report.countedEventCount,
    targetMaxCountPerYear: output.report.targetMaxCountPerYear,
    targetSatisfied: output.report.targetSatisfied,
    inputPath: options.inputPath,
    schemaMapPath: options.schemaMapPath,
    reportPath: toPosixPath(path.relative(options.archiveDir, reportPath)),
  };
}

export function buildNextManifest(
  manifest: Module03Kpi06ArchiveManifest,
  options: {
    archiveDir: string;
    retentionMonths: number | null;
  },
  entry: Module03Kpi06ArchiveEntry,
  archivedAt: string
): {
  retentionResult: RetentionPolicyResult;
  nextManifest: Module03Kpi06ArchiveManifest;
} {
  const upsertedEntries = upsertArchiveEntry(manifest.entries, entry);
  const retentionResult = applyRetentionPolicy(
    upsertedEntries,
    options.archiveDir,
    options.retentionMonths,
    archivedAt
  );

  return {
    retentionResult,
    nextManifest: {
      ...manifest,
      generatedAt: archivedAt,
      archiveDir: options.archiveDir,
      entries: retentionResult.entries,
      retentionPolicy: {
        retentionMonths: options.retentionMonths,
        cutoffMonth: retentionResult.cutoffMonth,
        appliedAt: archivedAt,
        prunedEntryCount: retentionResult.prunedEntries.length,
        prunedReportCount: retentionResult.prunedReportCount,
        prunedMonths: retentionResult.prunedMonths,
      },
    },
  };
}

export function writeArchiveOutputs(
  paths: ArchiveExecutionPaths,
  manifest: Module03Kpi06ArchiveManifest,
  entry: Module03Kpi06ArchiveEntry,
  archivedAt: string
): void {
  writeJsonFile(paths.manifestPath, manifest);
  writeJsonFile(paths.latestPath, {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "monthly_archive_latest",
    generatedAt: archivedAt,
    entry,
  });
}
