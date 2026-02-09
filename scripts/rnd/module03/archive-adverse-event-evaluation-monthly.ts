// RND: Module 03 KPI #6 monthly archival runner for ops-ingestion evaluation.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  inputPath: string;
  schemaMapPath: string | null;
  archiveDir: string;
  windowEnd: string;
  retentionMonths: number | null;
};

type Module03Kpi06OpsOutput = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  generatedAt: string;
  evaluatedAt: string;
  sourceRowCount: number;
  report: {
    windowStart: string;
    windowEnd: string;
    countedEventCount: number;
    targetMaxCountPerYear: number;
    targetSatisfied: boolean;
  };
};

type Module03Kpi06ArchiveEntry = {
  month: string;
  archivedAt: string;
  evaluatedAt: string;
  windowStart: string;
  windowEnd: string;
  sourceRowCount: number;
  countedEventCount: number;
  targetMaxCountPerYear: number;
  targetSatisfied: boolean;
  inputPath: string;
  schemaMapPath: string | null;
  reportPath: string;
};

type Module03Kpi06ArchiveManifest = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "monthly_archive";
  generatedAt: string;
  archiveDir: string;
  entries: Module03Kpi06ArchiveEntry[];
  retentionPolicy?: {
    retentionMonths: number | null;
    cutoffMonth: string | null;
    appliedAt: string;
    prunedEntryCount: number;
    prunedReportCount: number;
    prunedMonths: string[];
  };
};

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const DEFAULT_ARCHIVE_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-monthly-archive"
);
const OPS_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-from-source.cjs"
);
const MANIFEST_FILE_NAME = "archive-manifest.json";

function getArgValue(argv: string[], flag: string): string | null {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex < 0) {
    return null;
  }

  const value = argv[flagIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function normalizeIsoDate(value: string, label: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`${label} must be a valid ISO-8601 datetime.`);
  }
  return parsed.toISOString();
}

function parseArgs(argv: string[]): CliArgs {
  const inputPathValue = getArgValue(argv, "--input");
  if (!inputPathValue) {
    throw new Error("--input is required and must point to a JSON export file.");
  }

  const schemaMapPathValue = getArgValue(argv, "--schema-map");
  const archiveDirValue = getArgValue(argv, "--archive-dir");
  const windowEndValue = getArgValue(argv, "--window-end") ?? new Date().toISOString();
  const retentionMonthsValue = getArgValue(argv, "--retention-months");

  const inputPath = path.resolve(inputPathValue);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  const schemaMapPath = schemaMapPathValue ? path.resolve(schemaMapPathValue) : null;
  if (schemaMapPath && !fs.existsSync(schemaMapPath)) {
    throw new Error(`--schema-map file does not exist: ${schemaMapPath}`);
  }

  let retentionMonths: number | null = null;
  if (retentionMonthsValue !== null) {
    const parsed = Number.parseInt(retentionMonthsValue, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("--retention-months must be a positive integer.");
    }
    retentionMonths = parsed;
  }

  return {
    inputPath,
    schemaMapPath,
    archiveDir: archiveDirValue ? path.resolve(archiveDirValue) : DEFAULT_ARCHIVE_DIR,
    windowEnd: normalizeIsoDate(windowEndValue, "--window-end"),
    retentionMonths,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function assertFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
  return value;
}

function assertBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }
  return value;
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  try {
    return JSON.parse(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    throw new Error(`Failed to parse JSON file ${filePath}: ${message}`);
  }
}

function readOpsOutput(outputPath: string): Module03Kpi06OpsOutput {
  const raw = readJsonFile(outputPath);
  if (!isPlainObject(raw)) {
    throw new Error(`Ops output at ${outputPath} must be a JSON object.`);
  }

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

  if (!isPlainObject(raw.report)) {
    throw new Error("output.report must be a JSON object.");
  }

  const reportWindowStart = assertNonEmptyString(raw.report.windowStart, "output.report.windowStart");
  const reportWindowEnd = assertNonEmptyString(raw.report.windowEnd, "output.report.windowEnd");

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
    report: {
      windowStart: normalizeIsoDate(reportWindowStart, "output.report.windowStart"),
      windowEnd: normalizeIsoDate(reportWindowEnd, "output.report.windowEnd"),
      countedEventCount: assertFiniteNumber(
        raw.report.countedEventCount,
        "output.report.countedEventCount"
      ),
      targetMaxCountPerYear: assertFiniteNumber(
        raw.report.targetMaxCountPerYear,
        "output.report.targetMaxCountPerYear"
      ),
      targetSatisfied: assertBoolean(
        raw.report.targetSatisfied,
        "output.report.targetSatisfied"
      ),
    },
  };
}

function parseArchiveEntry(
  rawEntry: unknown,
  index: number
): Module03Kpi06ArchiveEntry {
  if (!isPlainObject(rawEntry)) {
    throw new Error(`manifest.entries[${index}] must be an object.`);
  }

  return {
    month: assertNonEmptyString(rawEntry.month, `manifest.entries[${index}].month`),
    archivedAt: normalizeIsoDate(
      assertNonEmptyString(rawEntry.archivedAt, `manifest.entries[${index}].archivedAt`),
      `manifest.entries[${index}].archivedAt`
    ),
    evaluatedAt: normalizeIsoDate(
      assertNonEmptyString(rawEntry.evaluatedAt, `manifest.entries[${index}].evaluatedAt`),
      `manifest.entries[${index}].evaluatedAt`
    ),
    windowStart: normalizeIsoDate(
      assertNonEmptyString(rawEntry.windowStart, `manifest.entries[${index}].windowStart`),
      `manifest.entries[${index}].windowStart`
    ),
    windowEnd: normalizeIsoDate(
      assertNonEmptyString(rawEntry.windowEnd, `manifest.entries[${index}].windowEnd`),
      `manifest.entries[${index}].windowEnd`
    ),
    sourceRowCount: assertFiniteNumber(
      rawEntry.sourceRowCount,
      `manifest.entries[${index}].sourceRowCount`
    ),
    countedEventCount: assertFiniteNumber(
      rawEntry.countedEventCount,
      `manifest.entries[${index}].countedEventCount`
    ),
    targetMaxCountPerYear: assertFiniteNumber(
      rawEntry.targetMaxCountPerYear,
      `manifest.entries[${index}].targetMaxCountPerYear`
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

function readArchiveManifest(
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

function writeJsonFile(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function toMonthToken(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toPathSafeTimestamp(isoDateTime: string): string {
  return isoDateTime.replace(/[:.]/g, "-");
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

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

function applyRetentionPolicy(
  entries: Module03Kpi06ArchiveEntry[],
  archiveDir: string,
  retentionMonths: number | null,
  appliedAt: string
): {
  entries: Module03Kpi06ArchiveEntry[];
  cutoffMonth: string | null;
  prunedEntries: Module03Kpi06ArchiveEntry[];
  prunedReportCount: number;
  prunedMonths: string[];
} {
  if (retentionMonths === null) {
    return {
      entries,
      cutoffMonth: null,
      prunedEntries: [],
      prunedReportCount: 0,
      prunedMonths: [],
    };
  }

  const appliedMonthStart = monthStartUtcMs(appliedAt);
  const appliedDate = new Date(appliedMonthStart);
  const cutoffMonthStart = Date.UTC(
    appliedDate.getUTCFullYear(),
    appliedDate.getUTCMonth() - (retentionMonths - 1),
    1
  );

  const keptEntries: Module03Kpi06ArchiveEntry[] = [];
  const prunedEntries: Module03Kpi06ArchiveEntry[] = [];

  for (const entry of entries) {
    if (monthStartUtcMs(entry.windowEnd) >= cutoffMonthStart) {
      keptEntries.push(entry);
      continue;
    }
    prunedEntries.push(entry);
  }

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

  for (const month of prunedMonthsSet) {
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

  return {
    entries: keptEntries,
    cutoffMonth: monthTokenFromUtcMonthStart(cutoffMonthStart),
    prunedEntries,
    prunedReportCount,
    prunedMonths: [...prunedMonthsSet].sort(),
  };
}

function upsertArchiveEntry(
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

function runOpsEvaluation(args: CliArgs, outputPath: string): void {
  if (!fs.existsSync(OPS_RUNNER_PATH)) {
    throw new Error(`Ops evaluation runner does not exist: ${OPS_RUNNER_PATH}`);
  }

  const runnerArgs = [
    OPS_RUNNER_PATH,
    "--input",
    args.inputPath,
    "--out",
    outputPath,
    "--evaluated-at",
    args.windowEnd,
  ];
  if (args.schemaMapPath) {
    runnerArgs.push("--schema-map", args.schemaMapPath);
  }

  try {
    execFileSync(process.execPath, runnerArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: unknown) {
    const processError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    const stdout = typeof processError.stdout === "string" ? processError.stdout.trim() : "";
    const stderr = typeof processError.stderr === "string" ? processError.stderr.trim() : "";

    throw new Error(
      [
        "Failed to run Module 03 KPI #6 ops evaluation.",
        `Command: node ${path.relative(process.cwd(), OPS_RUNNER_PATH)} --input ${args.inputPath} --out ${outputPath} --evaluated-at ${args.windowEnd}`,
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const monthToken = toMonthToken(args.windowEnd);
  const timestampToken = toPathSafeTimestamp(args.windowEnd);

  const monthArchiveDir = path.join(args.archiveDir, monthToken);
  const reportPath = path.join(
    monthArchiveDir,
    `kpi06-ops-evaluation-${timestampToken}.json`
  );
  fs.mkdirSync(monthArchiveDir, { recursive: true });

  runOpsEvaluation(args, reportPath);
  const output = readOpsOutput(reportPath);

  const archivedAt = new Date().toISOString();
  const entry: Module03Kpi06ArchiveEntry = {
    month: toMonthToken(output.report.windowEnd),
    archivedAt,
    evaluatedAt: output.evaluatedAt,
    windowStart: output.report.windowStart,
    windowEnd: output.report.windowEnd,
    sourceRowCount: output.sourceRowCount,
    countedEventCount: output.report.countedEventCount,
    targetMaxCountPerYear: output.report.targetMaxCountPerYear,
    targetSatisfied: output.report.targetSatisfied,
    inputPath: args.inputPath,
    schemaMapPath: args.schemaMapPath,
    reportPath: toPosixPath(path.relative(args.archiveDir, reportPath)),
  };

  const manifestPath = path.join(args.archiveDir, MANIFEST_FILE_NAME);
  const manifest = readArchiveManifest(manifestPath, args.archiveDir);
  const upsertedEntries = upsertArchiveEntry(manifest.entries, entry);
  const retentionResult = applyRetentionPolicy(
    upsertedEntries,
    args.archiveDir,
    args.retentionMonths,
    archivedAt
  );
  const nextManifest: Module03Kpi06ArchiveManifest = {
    ...manifest,
    generatedAt: archivedAt,
    archiveDir: args.archiveDir,
    entries: retentionResult.entries,
    retentionPolicy: {
      retentionMonths: args.retentionMonths,
      cutoffMonth: retentionResult.cutoffMonth,
      appliedAt: archivedAt,
      prunedEntryCount: retentionResult.prunedEntries.length,
      prunedReportCount: retentionResult.prunedReportCount,
      prunedMonths: retentionResult.prunedMonths,
    },
  };

  writeJsonFile(manifestPath, nextManifest);
  writeJsonFile(path.join(args.archiveDir, "latest.json"), {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "monthly_archive_latest",
    generatedAt: archivedAt,
    entry,
  });

  console.log(`Wrote Module 03 KPI #6 monthly archive report: ${reportPath}`);
  console.log(`Updated Module 03 KPI #6 archive manifest: ${manifestPath}`);
  if (args.retentionMonths !== null) {
    console.log(
      `Applied retention policy: ${args.retentionMonths} month(s), pruned entries=${retentionResult.prunedEntries.length}, pruned reports=${retentionResult.prunedReportCount}`
    );
  }
}

main();
