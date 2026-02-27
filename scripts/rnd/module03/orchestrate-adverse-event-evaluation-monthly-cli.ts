import fs from "node:fs";
import path from "node:path";
import {
  getArgValue,
  normalizeIsoDate,
  normalizeOptionalHttpUrl,
  parsePositiveIntegerOrNull,
  parsePositiveIntegerWithDefault,
  parseRequiredEnvKeys,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { CliArgs } from "./orchestrate-adverse-event-evaluation-monthly-types";

export const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);
export const DEFAULT_ARCHIVE_DIR = path.resolve("tmp", "rnd", "module03", "kpi06-monthly-archive");
export const DEFAULT_HANDOFF_DIR = path.resolve("tmp", "rnd", "module03", "kpi06-warehouse-handoff");
export const DEFAULT_EXPORT_DIR = path.resolve("tmp", "rnd", "module03", "kpi06-warehouse-export");
export const DEFAULT_FAILURE_ALERT_DIR = path.resolve(
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-failure-alerts"
);
export const DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS = 5_000;

function assertInputSourceProvided(
  inputPathValue: string | null,
  exportCommandValue: string | null
): void {
  if (!inputPathValue && !exportCommandValue) {
    throw new Error(
      "Either --input (pre-exported JSON) or --export-command (warehouse extract command) is required."
    );
  }
}

function parseOptionalExistingFileArg(value: string | null, flagName: string): string | null {
  if (!value) {
    return null;
  }
  const resolvedPath = path.resolve(value);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${flagName} file does not exist: ${resolvedPath}`);
  }
  return resolvedPath;
}

function parseRequiredExistingFileArg(
  value: string | null,
  fallbackPath: string,
  flagName: string
): string {
  const resolvedPath = path.resolve(value ?? fallbackPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${flagName} file does not exist: ${resolvedPath}`);
  }
  return resolvedPath;
}

function parseFailureWebhookUrlArg(argv: string[]): string | null {
  const failureWebhookUrlValue =
    getArgValue(argv, "--failure-webhook-url") ??
    process.env.RND_MODULE03_FAILURE_WEBHOOK_URL ??
    null;
  return normalizeOptionalHttpUrl(
    failureWebhookUrlValue,
    "--failure-webhook-url or RND_MODULE03_FAILURE_WEBHOOK_URL"
  );
}

function parseFailureWebhookTimeoutArg(argv: string[]): number {
  const failureWebhookTimeoutValue =
    getArgValue(argv, "--failure-webhook-timeout-ms") ??
    process.env.RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS ??
    null;
  return parsePositiveIntegerWithDefault(
    failureWebhookTimeoutValue,
    "--failure-webhook-timeout-ms or RND_MODULE03_FAILURE_WEBHOOK_TIMEOUT_MS",
    DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS
  );
}

export function parseArgs(argv: string[]): CliArgs {
  const inputPathValue = getArgValue(argv, "--input");
  const exportCommandValue = getArgValue(argv, "--export-command");
  assertInputSourceProvided(inputPathValue, exportCommandValue);

  const schemaMapPathValue = getArgValue(argv, "--schema-map");
  const sqlTemplatePathValue = getArgValue(argv, "--sql-template");
  const archiveDirValue = getArgValue(argv, "--archive-dir");
  const handoffDirValue = getArgValue(argv, "--handoff-dir");
  const exportOutPathValue = getArgValue(argv, "--export-out");
  const windowEndValue = getArgValue(argv, "--window-end") ?? new Date().toISOString();
  const retentionMonthsValue = getArgValue(argv, "--retention-months");
  const requiredEnvKeysValue = getArgValue(argv, "--require-env");
  const failureAlertDirValue = getArgValue(argv, "--failure-alert-dir");

  return {
    inputPath: parseOptionalExistingFileArg(inputPathValue, "--input"),
    exportCommand: exportCommandValue,
    schemaMapPath: parseOptionalExistingFileArg(schemaMapPathValue, "--schema-map"),
    sqlTemplatePath: parseRequiredExistingFileArg(
      sqlTemplatePathValue,
      DEFAULT_SQL_TEMPLATE_PATH,
      "--sql-template"
    ),
    archiveDir: archiveDirValue ? path.resolve(archiveDirValue) : DEFAULT_ARCHIVE_DIR,
    handoffDir: handoffDirValue ? path.resolve(handoffDirValue) : DEFAULT_HANDOFF_DIR,
    exportOutPath: exportOutPathValue ? path.resolve(exportOutPathValue) : null,
    windowEnd: normalizeIsoDate(windowEndValue, "--window-end"),
    retentionMonths: parsePositiveIntegerOrNull(retentionMonthsValue, "--retention-months"),
    requiredEnvKeys: parseRequiredEnvKeys(requiredEnvKeysValue, "--require-env"),
    failureAlertDir: failureAlertDirValue
      ? path.resolve(failureAlertDirValue)
      : DEFAULT_FAILURE_ALERT_DIR,
    failureWebhookUrl: parseFailureWebhookUrlArg(argv),
    failureWebhookTimeoutMs: parseFailureWebhookTimeoutArg(argv),
  };
}
