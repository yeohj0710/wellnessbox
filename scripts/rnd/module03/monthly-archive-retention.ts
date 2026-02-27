import fs from "node:fs";
import path from "node:path";
import { toMonthToken } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  Module03Kpi06ArchiveEntry,
  RetentionPolicyResult,
} from "./monthly-archive-types";

function isPathInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function monthStartUtcMs(isoDateTime: string): number {
  const parsed = new Date(isoDateTime);
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1);
}

function monthTokenFromUtcMonthStart(monthStartMs: number): string {
  return toMonthToken(new Date(monthStartMs).toISOString());
}

function cutoffMonthStartUtcMs(appliedAt: string, retentionMonths: number): number {
  const appliedMonthStart = monthStartUtcMs(appliedAt);
  const appliedDate = new Date(appliedMonthStart);
  return Date.UTC(
    appliedDate.getUTCFullYear(),
    appliedDate.getUTCMonth() - (retentionMonths - 1),
    1
  );
}

function partitionEntriesByCutoffMonth(
  entries: Module03Kpi06ArchiveEntry[],
  cutoffMonthStart: number
): {
  keptEntries: Module03Kpi06ArchiveEntry[];
  prunedEntries: Module03Kpi06ArchiveEntry[];
} {
  const keptEntries: Module03Kpi06ArchiveEntry[] = [];
  const prunedEntries: Module03Kpi06ArchiveEntry[] = [];

  for (const entry of entries) {
    if (monthStartUtcMs(entry.windowEnd) >= cutoffMonthStart) {
      keptEntries.push(entry);
      continue;
    }
    prunedEntries.push(entry);
  }

  return { keptEntries, prunedEntries };
}

function pruneArchivedReports(
  archiveDir: string,
  prunedEntries: Module03Kpi06ArchiveEntry[]
): {
  prunedReportCount: number;
  prunedMonths: string[];
} {
  let prunedReportCount = 0;
  const prunedMonthsSet = new Set<string>();

  for (const entry of prunedEntries) {
    prunedMonthsSet.add(entry.month);
    const absoluteReportPath = path.resolve(archiveDir, entry.reportPath);
    if (!isPathInsideDirectory(absoluteReportPath, archiveDir)) {
      throw new Error(
        `Refusing to delete report outside archive directory: ${entry.reportPath}`
      );
    }
    if (fs.existsSync(absoluteReportPath)) {
      fs.unlinkSync(absoluteReportPath);
      prunedReportCount += 1;
    }
  }

  return {
    prunedReportCount,
    prunedMonths: [...prunedMonthsSet].sort(),
  };
}

function pruneEmptyMonthDirectories(archiveDir: string, prunedMonths: string[]): void {
  for (const month of prunedMonths) {
    const monthDirPath = path.join(archiveDir, month);
    if (!fs.existsSync(monthDirPath)) {
      continue;
    }
    const monthDirStats = fs.statSync(monthDirPath);
    if (!monthDirStats.isDirectory()) {
      continue;
    }
    if (fs.readdirSync(monthDirPath).length === 0) {
      fs.rmdirSync(monthDirPath);
    }
  }
}

export function applyRetentionPolicy(
  entries: Module03Kpi06ArchiveEntry[],
  archiveDir: string,
  retentionMonths: number | null,
  appliedAt: string
): RetentionPolicyResult {
  if (retentionMonths === null) {
    return {
      entries,
      cutoffMonth: null,
      prunedEntries: [],
      prunedReportCount: 0,
      prunedMonths: [],
    };
  }

  const cutoffMonthStart = cutoffMonthStartUtcMs(appliedAt, retentionMonths);
  const { keptEntries, prunedEntries } = partitionEntriesByCutoffMonth(
    entries,
    cutoffMonthStart
  );
  const { prunedReportCount, prunedMonths } = pruneArchivedReports(
    archiveDir,
    prunedEntries
  );
  pruneEmptyMonthDirectories(archiveDir, prunedMonths);

  return {
    entries: keptEntries,
    cutoffMonth: monthTokenFromUtcMonthStart(cutoffMonthStart),
    prunedEntries,
    prunedReportCount,
    prunedMonths,
  };
}

export function upsertArchiveEntry(
  entries: Module03Kpi06ArchiveEntry[],
  nextEntry: Module03Kpi06ArchiveEntry
): Module03Kpi06ArchiveEntry[] {
  const withoutSameWindow = entries.filter(
    (entry) => entry.windowEnd !== nextEntry.windowEnd
  );
  return [...withoutSameWindow, nextEntry].sort(
    (left, right) => Date.parse(left.windowEnd) - Date.parse(right.windowEnd)
  );
}
