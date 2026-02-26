import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonEmptyString,
  isPlainObject,
  normalizeIsoDate,
  readJsonFile,
  toMonthToken,
  toPathSafeTimestamp,
  type Module03ArchiveLatest,
  type Module03ArchiveLatestEntry,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  assertRunnerExists,
  formatCommandFailure,
  runNodeScript,
} from "./node-script-runner";
import type {
  CliArgs,
  ResolvedExportInput,
} from "./orchestrate-adverse-event-evaluation-monthly-types";

function renderExportCommandTemplate(
  template: string,
  context: {
    windowEndUtc: string;
    sqlTemplatePath: string;
    exportOutputPath: string;
  }
): string {
  return template
    .split("{{window_end_utc}}")
    .join(context.windowEndUtc)
    .split("{{sql_template_path}}")
    .join(context.sqlTemplatePath)
    .split("{{export_output_path}}")
    .join(context.exportOutputPath);
}

function runWarehouseExport(
  exportCommandTemplate: string,
  params: {
    windowEndUtc: string;
    sqlTemplatePath: string;
    exportOutputPath: string;
  }
): string {
  const resolvedCommand = renderExportCommandTemplate(exportCommandTemplate, params);
  fs.mkdirSync(path.dirname(params.exportOutputPath), { recursive: true });

  try {
    execSync(resolvedCommand, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        RND_WINDOW_END_UTC: params.windowEndUtc,
        RND_SQL_TEMPLATE_PATH: params.sqlTemplatePath,
        RND_EXPORT_OUTPUT_PATH: params.exportOutputPath,
      },
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
        "Warehouse export command failed.",
        `Command: ${resolvedCommand}`,
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  if (!fs.existsSync(params.exportOutputPath)) {
    throw new Error(
      `Warehouse export command completed without creating output file: ${params.exportOutputPath}`
    );
  }
  return resolvedCommand;
}

export function resolveExportInput(
  args: CliArgs,
  defaultExportDir: string
): ResolvedExportInput {
  if (args.inputPath) {
    return {
      exportInputPath: args.inputPath,
      exportSource: "provided_input",
      resolvedExportCommand: null,
    };
  }
  if (!args.exportCommand) {
    throw new Error("Internal error: export command is required when --input is not provided.");
  }

  const timestampToken = toPathSafeTimestamp(args.windowEnd);
  const monthToken = toMonthToken(args.windowEnd);
  const exportOutputPath =
    args.exportOutPath ??
    path.join(defaultExportDir, monthToken, `kpi06-warehouse-export-${timestampToken}.json`);

  const resolvedExportCommand = runWarehouseExport(args.exportCommand, {
    windowEndUtc: args.windowEnd,
    sqlTemplatePath: args.sqlTemplatePath,
    exportOutputPath,
  });

  return {
    exportInputPath: exportOutputPath,
    exportSource: "scheduled_export",
    resolvedExportCommand,
  };
}

export function readExportRows(exportPath: string): unknown[] {
  const raw = readJsonFile(exportPath);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Warehouse export input must be a non-empty JSON array: ${exportPath}`
    );
  }
  return raw;
}

export function runArchiveEvaluation(
  inputPath: string,
  args: Pick<CliArgs, "archiveDir" | "schemaMapPath" | "windowEnd" | "retentionMonths">,
  archiveRunnerPath: string
): void {
  assertRunnerExists(archiveRunnerPath, "Archive");

  const runnerArgs = [
    "--input",
    inputPath,
    "--archive-dir",
    args.archiveDir,
    "--window-end",
    args.windowEnd,
  ];
  if (args.schemaMapPath) {
    runnerArgs.push("--schema-map", args.schemaMapPath);
  }
  if (args.retentionMonths !== null) {
    runnerArgs.push("--retention-months", String(args.retentionMonths));
  }

  const result = runNodeScript(archiveRunnerPath, runnerArgs);
  if (!result.succeeded) {
    throw new Error(
      [
        "Module 03 KPI #6 archive evaluation failed.",
        formatCommandFailure(result),
      ].join("\n")
    );
  }
}

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
