import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  normalizeIsoDate,
  parsePositiveIntegerWithDefault,
  parseRequiredEnvKeys as parseRequiredEnvKeysOrThrow,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  DEFAULT_ARCHIVE_DIR,
  DEFAULT_CADENCE_CRON,
  DEFAULT_EXPORT_COMMAND_TEMPLATE,
  DEFAULT_FAILURE_ALERT_DIR,
  DEFAULT_FAILURE_WEBHOOK_ENV_KEY,
  DEFAULT_FAILURE_WEBHOOK_TIMEOUT_ENV_KEY,
  DEFAULT_HANDOFF_DIR,
  DEFAULT_RETENTION_MONTHS,
  DEFAULT_SCHEMA_MAP_PATH,
  DEFAULT_SQL_TEMPLATE_PATH,
  DEFAULT_TIMEZONE,
} from "./scheduler-deployment-bundle-cli-defaults";

function assertCronExpression(value: string): string {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 5) {
    throw new Error("--cadence-cron must contain exactly 5 fields.");
  }
  return tokens.join(" ");
}

function assertEnvKey(value: string, fieldName: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${fieldName} must be a valid environment variable name.`);
  }
  return value;
}

function parseRequiredEnvKeys(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return parseRequiredEnvKeysOrThrow(value, "--require-env");
}

function assertFileExists(filePath: string, fieldName: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${fieldName} file does not exist: ${filePath}`);
  }
  return filePath;
}

export function parseOutPathArg(argv: string[]): string | null {
  return getArgValue(argv, "--out");
}

export function parseGeneratedAtArg(argv: string[]): string | null {
  const generatedAtRaw = getArgValue(argv, "--generated-at");
  return generatedAtRaw ? normalizeIsoDate(generatedAtRaw, "--generated-at") : null;
}

export function parseCadenceCronArg(argv: string[]): string {
  return assertCronExpression(getArgValue(argv, "--cadence-cron") ?? DEFAULT_CADENCE_CRON);
}

export function parseTimezoneArg(argv: string[]): string {
  return assertNonEmptyString(
    getArgValue(argv, "--timezone") ?? DEFAULT_TIMEZONE,
    "--timezone"
  );
}

export function parseRetentionMonthsArg(argv: string[]): number {
  return parsePositiveIntegerWithDefault(
    getArgValue(argv, "--retention-months"),
    "--retention-months",
    DEFAULT_RETENTION_MONTHS
  );
}

export function parseRequiredEnvKeysArg(argv: string[]): string[] {
  return parseRequiredEnvKeys(getArgValue(argv, "--require-env"));
}

export function parseExportCommandTemplateArg(argv: string[]): string {
  return getArgValue(argv, "--export-command-template") ?? DEFAULT_EXPORT_COMMAND_TEMPLATE;
}

export function parseSchemaMapPathArg(argv: string[]): string {
  return assertFileExists(
    path.resolve(getArgValue(argv, "--schema-map") ?? DEFAULT_SCHEMA_MAP_PATH),
    "--schema-map"
  );
}

export function parseSqlTemplatePathArg(argv: string[]): string {
  return assertFileExists(
    path.resolve(getArgValue(argv, "--sql-template") ?? DEFAULT_SQL_TEMPLATE_PATH),
    "--sql-template"
  );
}

export function parseArchiveDirArg(argv: string[]): string {
  return path.resolve(getArgValue(argv, "--archive-dir") ?? DEFAULT_ARCHIVE_DIR);
}

export function parseHandoffDirArg(argv: string[]): string {
  return path.resolve(getArgValue(argv, "--handoff-dir") ?? DEFAULT_HANDOFF_DIR);
}

export function parseFailureAlertDirArg(argv: string[]): string {
  return path.resolve(
    getArgValue(argv, "--failure-alert-dir") ?? DEFAULT_FAILURE_ALERT_DIR
  );
}

export function parseFailureWebhookEnvKeyArg(argv: string[]): string {
  return assertEnvKey(
    getArgValue(argv, "--failure-webhook-env") ?? DEFAULT_FAILURE_WEBHOOK_ENV_KEY,
    "--failure-webhook-env"
  );
}

export function parseFailureWebhookTimeoutEnvKeyArg(argv: string[]): string {
  return assertEnvKey(
    getArgValue(argv, "--failure-webhook-timeout-env") ??
      DEFAULT_FAILURE_WEBHOOK_TIMEOUT_ENV_KEY,
    "--failure-webhook-timeout-env"
  );
}
