// RND: Module 03 KPI #6 scheduler orchestration runner with warehouse export handoff artifacts.

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  inputPath: string | null;
  exportCommand: string | null;
  schemaMapPath: string | null;
  sqlTemplatePath: string;
  archiveDir: string;
  handoffDir: string;
  exportOutPath: string | null;
  windowEnd: string;
  retentionMonths: number | null;
  requiredEnvKeys: string[];
  failureAlertDir: string;
  failureWebhookUrl: string | null;
  failureWebhookTimeoutMs: number;
};

type Module03ArchiveLatestEntry = {
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

type Module03ArchiveLatest = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "monthly_archive_latest";
  generatedAt: string;
  entry: Module03ArchiveLatestEntry;
};

type Module03SchedulerFailureWebhookResult = {
  attempted: boolean;
  delivered: boolean;
  target: string | null;
  timeoutMs: number;
  statusCode: number | null;
  responsePreview: string | null;
  errorMessage: string | null;
};

type Module03SchedulerFailureAlert = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_failure_alert";
  generatedAt: string;
  windowEnd: string | null;
  commandArgs: string[];
  scheduler: {
    exportSource: "provided_input" | "scheduled_export" | "unknown";
    inputPath: string | null;
    archiveDir: string | null;
    handoffDir: string | null;
    requiredEnvKeys: string[];
    missingRequiredEnvKeys: string[];
    failureWebhookConfigured: boolean;
    failureAlertDir: string;
  };
  error: {
    name: string;
    message: string;
    stack: string | null;
  };
  webhook: Module03SchedulerFailureWebhookResult;
};

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function normalizeIsoDate(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`${fieldName} must be a valid ISO-8601 datetime.`);
  }
  return parsed.toISOString();
}

function parsePositiveIntegerOrNull(value: string | null, fieldName: string): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function parsePositiveIntegerWithDefault(
  value: string | null,
  fieldName: string,
  defaultValue: number
): number {
  if (value === null) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
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

function writeJsonFile(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function toPathSafeTimestamp(isoDateTime: string): string {
  return isoDateTime.replace(/[:.]/g, "-");
}

function toMonthToken(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function toWorkspacePath(value: string): string {
  const relativePath = path.relative(process.cwd(), value);
  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    return toPosixPath(relativePath);
  }
  return toPosixPath(value);
}

function parseRequiredEnvKeys(value: string | null, fieldName: string): string[] {
  if (value === null) {
    return [];
  }

  const keys = [...new Set(value.split(",").map((token) => token.trim()).filter(Boolean))];
  if (keys.length === 0) {
    throw new Error(`${fieldName} must include at least one environment variable name.`);
  }

  for (const key of keys) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(
        `${fieldName} contains an invalid environment variable name: "${key}".`
      );
    }
  }

  return keys;
}

function normalizeOptionalHttpUrl(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${fieldName} must use http:// or https://.`);
  }

  return parsed.toString();
}

function getMissingRequiredEnvKeys(requiredEnvKeys: string[]): string[] {
  return requiredEnvKeys.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function assertRequiredEnvironment(requiredEnvKeys: string[]): void {
  const missing = getMissingRequiredEnvKeys(requiredEnvKeys);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`
    );
  }
}

function normalizeError(error: unknown): { name: string; message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error.",
      stack: typeof error.stack === "string" ? error.stack : null,
    };
  }

  return {
    name: "Error",
    message: String(error),
    stack: null,
  };
}

function summarizeWebhookTarget(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}

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

function readExportRows(exportPath: string): unknown[] {
  const raw = readJsonFile(exportPath);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Warehouse export input must be a non-empty JSON array: ${exportPath}`
    );
  }
  return raw;
}

function runArchiveEvaluation(
  inputPath: string,
  args: Pick<CliArgs, "archiveDir" | "schemaMapPath" | "windowEnd" | "retentionMonths">
): void {
  if (!fs.existsSync(ARCHIVE_RUNNER_PATH)) {
    throw new Error(`Archive runner does not exist: ${ARCHIVE_RUNNER_PATH}`);
  }

  const runnerArgs = [
    ARCHIVE_RUNNER_PATH,
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
        "Module 03 KPI #6 archive evaluation failed.",
        `Command: node ${toWorkspacePath(ARCHIVE_RUNNER_PATH)} --input ${toWorkspacePath(inputPath)} --archive-dir ${toWorkspacePath(args.archiveDir)} --window-end ${args.windowEnd}`,
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
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

function readArchiveLatest(latestPath: string): Module03ArchiveLatest {
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
  if (moduleId !== MODULE_ID) {
    throw new Error(`latest.module must be "${MODULE_ID}", received "${moduleId}".`);
  }
  if (phase !== "EVALUATION") {
    throw new Error(`latest.phase must be "EVALUATION", received "${phase}".`);
  }
  if (kpiId !== KPI_ID) {
    throw new Error(`latest.kpiId must be "${KPI_ID}", received "${kpiId}".`);
  }
  if (artifact !== "monthly_archive_latest") {
    throw new Error(
      `latest.artifact must be "monthly_archive_latest", received "${artifact}".`
    );
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "monthly_archive_latest",
    generatedAt: normalizeIsoDate(
      assertNonEmptyString(raw.generatedAt, "latest.generatedAt"),
      "latest.generatedAt"
    ),
    entry: parseArchiveLatestEntry(raw.entry),
  };
}

function readArchiveManifestEntryCount(manifestPath: string): number {
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

function resolveExportInput(
  args: CliArgs
): {
  exportInputPath: string;
  exportSource: "provided_input" | "scheduled_export";
  resolvedExportCommand: string | null;
} {
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
    path.join(DEFAULT_EXPORT_DIR, monthToken, `kpi06-warehouse-export-${timestampToken}.json`);

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

async function deliverFailureWebhook(
  webhookUrl: string | null,
  timeoutMs: number,
  payload: Module03SchedulerFailureAlert
): Promise<Module03SchedulerFailureWebhookResult> {
  if (!webhookUrl) {
    return {
      attempted: false,
      delivered: false,
      target: null,
      timeoutMs,
      statusCode: null,
      responsePreview: null,
      errorMessage: null,
    };
  }

  const target = summarizeWebhookTarget(webhookUrl);
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
    const responseText = await response.text();
    return {
      attempted: true,
      delivered: response.ok,
      target,
      timeoutMs,
      statusCode: response.status,
      responsePreview: responseText.slice(0, 500),
      errorMessage: response.ok ? null : `Webhook returned HTTP ${response.status}.`,
    };
  } catch (error: unknown) {
    return {
      attempted: true,
      delivered: false,
      target,
      timeoutMs,
      statusCode: null,
      responsePreview: null,
      errorMessage: normalizeError(error).message,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function emitFailureAlert(
  args: CliArgs | null,
  rawArgv: string[],
  error: unknown
): Promise<string> {
  const generatedAt = new Date().toISOString();
  const missingRequiredEnvKeys = getMissingRequiredEnvKeys(args?.requiredEnvKeys ?? []);
  const basePayload: Module03SchedulerFailureAlert = {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_failure_alert",
    generatedAt,
    windowEnd: args?.windowEnd ?? null,
    commandArgs: rawArgv,
    scheduler: {
      exportSource: args
        ? args.inputPath
          ? "provided_input"
          : args.exportCommand
            ? "scheduled_export"
            : "unknown"
        : "unknown",
      inputPath: args?.inputPath ? toWorkspacePath(args.inputPath) : null,
      archiveDir: args?.archiveDir ? toWorkspacePath(args.archiveDir) : null,
      handoffDir: args?.handoffDir ? toWorkspacePath(args.handoffDir) : null,
      requiredEnvKeys: args?.requiredEnvKeys ?? [],
      missingRequiredEnvKeys,
      failureWebhookConfigured: Boolean(args?.failureWebhookUrl),
      failureAlertDir: toWorkspacePath(args?.failureAlertDir ?? DEFAULT_FAILURE_ALERT_DIR),
    },
    error: normalizeError(error),
    webhook: {
      attempted: false,
      delivered: false,
      target: summarizeWebhookTarget(args?.failureWebhookUrl ?? null),
      timeoutMs: args?.failureWebhookTimeoutMs ?? DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS,
      statusCode: null,
      responsePreview: null,
      errorMessage: null,
    },
  };

  const webhookResult = await deliverFailureWebhook(
    args?.failureWebhookUrl ?? null,
    args?.failureWebhookTimeoutMs ?? DEFAULT_FAILURE_WEBHOOK_TIMEOUT_MS,
    basePayload
  );
  const payload: Module03SchedulerFailureAlert = {
    ...basePayload,
    webhook: webhookResult,
  };

  const alertDir = args?.failureAlertDir ?? DEFAULT_FAILURE_ALERT_DIR;
  const alertMonth = toMonthToken(generatedAt);
  const alertPath = path.join(
    alertDir,
    alertMonth,
    `kpi06-scheduler-failure-${toPathSafeTimestamp(generatedAt)}.json`
  );
  writeJsonFile(alertPath, payload);
  writeJsonFile(path.join(alertDir, "latest.json"), {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_failure_alert_latest",
    generatedAt,
    alertPath: toPosixPath(path.relative(alertDir, alertPath)),
  });

  return alertPath;
}

function runScheduler(args: CliArgs): void {
  if (args.inputPath && args.exportCommand) {
    console.warn(
      "Both --input and --export-command were provided; --input takes precedence and export command is skipped."
    );
  }

  assertRequiredEnvironment(args.requiredEnvKeys);

  const exportResult = resolveExportInput(args);
  const exportRows = readExportRows(exportResult.exportInputPath);
  runArchiveEvaluation(exportResult.exportInputPath, args);

  const latestPath = path.join(args.archiveDir, "latest.json");
  const manifestPath = path.join(args.archiveDir, "archive-manifest.json");
  const archiveLatest = readArchiveLatest(latestPath);
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
      const alertPath = await emitFailureAlert(args, rawArgv, error);
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
