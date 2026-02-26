// RND: Module 03 KPI #6 scheduler orchestration runner with warehouse export handoff artifacts.

import fs from "node:fs";
import path from "node:path";
import {
  assertRequiredEnvironment,
  getArgValue,
  normalizeError,
  normalizeIsoDate,
  normalizeOptionalHttpUrl,
  parsePositiveIntegerOrNull,
  parsePositiveIntegerWithDefault,
  parseRequiredEnvKeys,
  toMonthToken,
  toPathSafeTimestamp,
  toPosixPath,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  readArchiveLatest,
  readArchiveManifestEntryCount,
  readExportRows,
  resolveExportInput,
  runArchiveEvaluation,
} from "./orchestrate-adverse-event-evaluation-monthly-export";
import { emitFailureAlert } from "./orchestrate-adverse-event-evaluation-monthly-failure-alert";
import type { CliArgs } from "./orchestrate-adverse-event-evaluation-monthly-types";

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const ARCHIVE_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-archive.cjs"
);
const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);
const DEFAULT_ARCHIVE_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-monthly-archive"
);
const DEFAULT_HANDOFF_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-warehouse-handoff"
);
const DEFAULT_EXPORT_DIR = path.resolve("tmp", "rnd", "module03", "kpi06-warehouse-export");
const DEFAULT_FAILURE_ALERT_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-failure-alerts"
);
const DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS = 5_000;

function parseArgs(argv: string[]): CliArgs {
  const inputPathValue = getArgValue(argv, "--input");
  const exportCommandValue = getArgValue(argv, "--export-command");
  if (!inputPathValue && !exportCommandValue) {
    throw new Error(
      "Either --input (pre-exported JSON) or --export-command (warehouse extract command) is required."
    );
  }

  const schemaMapPathValue = getArgValue(argv, "--schema-map");
  const sqlTemplatePathValue = getArgValue(argv, "--sql-template");
  const archiveDirValue = getArgValue(argv, "--archive-dir");
  const handoffDirValue = getArgValue(argv, "--handoff-dir");
  const exportOutPathValue = getArgValue(argv, "--export-out");
  const windowEndValue = getArgValue(argv, "--window-end") ?? new Date().toISOString();
  const retentionMonthsValue = getArgValue(argv, "--retention-months");
  const requiredEnvKeysValue = getArgValue(argv, "--require-env");
  const failureAlertDirValue = getArgValue(argv, "--failure-alert-dir");
  const failureWebhookUrlValue =
    getArgValue(argv, "--failure-webhook-url") ??
    process.env.RND_MODULE03_FAILURE_WEBHOOK_URL ??
    null;
  const failureWebhookTimeoutValue =
    getArgValue(argv, "--failure-webhook-timeout-ms") ??
    process.env.RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS ??
    null;

  const inputPath = inputPathValue ? path.resolve(inputPathValue) : null;
  if (inputPath && !fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  const schemaMapPath = schemaMapPathValue ? path.resolve(schemaMapPathValue) : null;
  if (schemaMapPath && !fs.existsSync(schemaMapPath)) {
    throw new Error(`--schema-map file does not exist: ${schemaMapPath}`);
  }

  const sqlTemplatePath = path.resolve(sqlTemplatePathValue ?? DEFAULT_SQL_TEMPLATE_PATH);
  if (!fs.existsSync(sqlTemplatePath)) {
    throw new Error(`--sql-template file does not exist: ${sqlTemplatePath}`);
  }

  return {
    inputPath,
    exportCommand: exportCommandValue,
    schemaMapPath,
    sqlTemplatePath,
    archiveDir: archiveDirValue ? path.resolve(archiveDirValue) : DEFAULT_ARCHIVE_DIR,
    handoffDir: handoffDirValue ? path.resolve(handoffDirValue) : DEFAULT_HANDOFF_DIR,
    exportOutPath: exportOutPathValue ? path.resolve(exportOutPathValue) : null,
    windowEnd: normalizeIsoDate(windowEndValue, "--window-end"),
    retentionMonths: parsePositiveIntegerOrNull(retentionMonthsValue, "--retention-months"),
    requiredEnvKeys: parseRequiredEnvKeys(requiredEnvKeysValue, "--require-env"),
    failureAlertDir: failureAlertDirValue
      ? path.resolve(failureAlertDirValue)
      : DEFAULT_FAILURE_ALERT_DIR,
    failureWebhookUrl: normalizeOptionalHttpUrl(
      failureWebhookUrlValue,
      "--failure-webhook-url or RND_MODULE03_FAILURE_WEBHOOK_URL"
    ),
    failureWebhookTimeoutMs: parsePositiveIntegerWithDefault(
      failureWebhookTimeoutValue,
      "--failure-webhook-timeout-ms or RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS",
      DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS
    ),
  };
}

function runScheduler(args: CliArgs): void {
  if (args.inputPath && args.exportCommand) {
    console.warn(
      "Both --input and --export-command were provided; --input takes precedence and export command is skipped."
    );
  }

  assertRequiredEnvironment(args.requiredEnvKeys);

  const exportResult = resolveExportInput(args, DEFAULT_EXPORT_DIR);
  const exportRows = readExportRows(exportResult.exportInputPath);
  runArchiveEvaluation(exportResult.exportInputPath, args, ARCHIVE_RUNNER_PATH);

  const latestPath = path.join(args.archiveDir, "latest.json");
  const manifestPath = path.join(args.archiveDir, "archive-manifest.json");
  const archiveLatest = readArchiveLatest(latestPath, {
    moduleId: MODULE_ID,
    kpiId: KPI_ID,
  });
  const manifestEntryCount = readArchiveManifestEntryCount(manifestPath);

  const handoffGeneratedAt = new Date().toISOString();
  const handoffMonth = archiveLatest.entry.month;
  const handoffPath = path.join(
    args.handoffDir,
    handoffMonth,
    `kpi06-warehouse-handoff-${toPathSafeTimestamp(handoffGeneratedAt)}.json`
  );
  const relativeReportPath = path.join(args.archiveDir, archiveLatest.entry.reportPath);

  const handoffArtifact = {
    module: MODULE_ID,
    phase: "EVALUATION" as const,
    kpiId: KPI_ID,
    artifact: "warehouse_export_handoff" as const,
    generatedAt: handoffGeneratedAt,
    windowEnd: args.windowEnd,
    scheduler: {
      exportSource: exportResult.exportSource,
      retentionMonths: args.retentionMonths,
      requiredEnvKeys: args.requiredEnvKeys,
      missingRequiredEnvKeys: [],
      exportCommandTemplate: args.exportCommand,
      resolvedExportCommand: exportResult.resolvedExportCommand,
      sqlTemplatePath: toWorkspacePath(args.sqlTemplatePath),
    },
    warehouseExport: {
      inputPath: toWorkspacePath(exportResult.exportInputPath),
      rowCount: exportRows.length,
    },
    archive: {
      archiveDir: toWorkspacePath(args.archiveDir),
      latestPath: toWorkspacePath(latestPath),
      manifestPath: toWorkspacePath(manifestPath),
      manifestEntryCount,
      reportPath: toWorkspacePath(relativeReportPath),
      latestEntry: archiveLatest.entry,
    },
  };

  writeJsonFile(handoffPath, handoffArtifact);
  writeJsonFile(path.join(args.handoffDir, "latest.json"), {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "warehouse_export_handoff_latest",
    generatedAt: handoffGeneratedAt,
    handoffPath: toPosixPath(path.relative(args.handoffDir, handoffPath)),
  });

  console.log(
    `Prepared Module 03 KPI #6 warehouse export input: ${toWorkspacePath(exportResult.exportInputPath)} (rows=${exportRows.length})`
  );
  console.log(`Updated Module 03 KPI #6 archive: ${toWorkspacePath(latestPath)}`);
  console.log(`Wrote Module 03 KPI #6 handoff artifact: ${toWorkspacePath(handoffPath)}`);
}

async function main() {
  const rawArgv = process.argv.slice(2);
  let args: CliArgs | null = null;

  try {
    args = parseArgs(rawArgv);
    runScheduler(args);
  } catch (error: unknown) {
    try {
      const alertPath = await emitFailureAlert(args, rawArgv, error, {
        moduleId: MODULE_ID,
        kpiId: KPI_ID,
        defaultFailureAlertDir: DEFAULT_FAILURE_ALERT_DIR,
        defaultFailureWebhookTimeoutMs: DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS,
      });
      console.error(
        `Wrote Module 03 KPI #6 scheduler failure alert: ${toWorkspacePath(alertPath)}`
      );
    } catch (alertError: unknown) {
      const normalizedAlertError = normalizeError(alertError);
      console.error(
        `Failed to write Module 03 KPI #6 scheduler failure alert: ${normalizedAlertError.message}`
      );
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  const normalizedError = normalizeError(error);
  console.error(normalizedError.message);
  process.exit(1);
});
