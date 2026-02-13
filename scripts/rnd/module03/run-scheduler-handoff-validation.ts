// RND: Module 03 KPI #6 one-command scheduler handoff validation runner.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  outDir: string;
  windowEnd: string;
  inputPath: string | null;
  requiredEnvKeys: string[];
  schedulerName: string;
  environment: string;
  strictEnv: boolean;
  sampleRowCount: number;
  secretBindingPairs: string[];
  envValuePairs: string[];
};

type SchedulerDeploymentBundle = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_deployment_bundle";
  generatedAt: string;
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
  };
  verification: {
    expectedOutputs: string[];
  };
};

type SchedulerDryRunReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_dry_run_report";
  verification: {
    allExpectedOutputsPresent: boolean;
    expectedOutputs: Array<{
      path: string;
      exists: boolean;
    }>;
  };
  dryRun: {
    missingRequiredEnvKeys: string[];
  };
};

type Module03SchedulerHandoffValidationSummary = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_handoff_validation";
  generatedAt: string;
  windowEnd: string;
  strictEnv: boolean;
  scheduler: {
    name: string;
    environment: string;
  };
  input: {
    source: "provided_input" | "generated_representative_window";
    path: string;
    rowCount: number;
  };
  secrets: {
    requiredEnvKeys: string[];
    boundSecretRefs: Array<{
      envKey: string;
      secretRef: string;
    }>;
    runtimeEnvKeysInjected: string[];
  };
  artifacts: {
    outDir: string;
    deploymentBundlePath: string;
    infraBindingPath: string;
    dryRunReportPath: string;
  };
  verification: {
    expectedOutputs: Array<{
      path: string;
      exists: boolean;
    }>;
    allExpectedOutputsPresent: boolean;
    missingRequiredEnvKeys: string[];
  };
};

type OpsAdverseEventRow = {
  event_id: string;
  case_id: string;
  reported_at: string;
  linked_to_engine_recommendation: "yes" | "no";
};

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REQUIRED_ENV_KEYS = ["RND_MODULE03_WAREHOUSE_EXPORT_TOKEN"];
const DEFAULT_SCHEDULER_NAME = "module03-kpi06-adverse-event-monthly";
const DEFAULT_ENVIRONMENT = "production-like";
const DEFAULT_SAMPLE_ROW_COUNT = 12;
const DEFAULT_OUT_DIR_ROOT = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-handoff-validation"
);
const BUNDLE_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-generate-scheduler-deployment-bundle.cjs"
);
const INFRA_BINDING_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-generate-scheduler-infra-binding.cjs"
);
const DRY_RUN_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-scheduler-dry-run-window.cjs"
);

function getArgValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function getArgValues(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) {
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value.`);
    }
    values.push(value);
  }
  return values;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function assertEnvironmentVariableName(value: string, fieldName: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${fieldName} must be a valid environment variable name.`);
  }
  return value;
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function normalizeIsoDateTime(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new Error(`${fieldName} must be a valid ISO-8601 datetime.`);
  }
  return parsed.toISOString();
}

function parseRequiredEnvKeys(value: string | null): string[] {
  if (!value) {
    return [...DEFAULT_REQUIRED_ENV_KEYS];
  }
  const keys = [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
  if (keys.length === 0) {
    throw new Error("--require-env must include at least one environment variable name.");
  }
  for (const key of keys) {
    assertEnvironmentVariableName(key, "--require-env");
  }
  return keys;
}

function parseKeyValuePair(rawPair: string, flagName: string): { key: string; value: string } {
  const delimiterIndex = rawPair.indexOf("=");
  if (delimiterIndex <= 0 || delimiterIndex === rawPair.length - 1) {
    throw new Error(`${flagName} must follow KEY=value format. Received "${rawPair}".`);
  }
  const key = assertEnvironmentVariableName(rawPair.slice(0, delimiterIndex).trim(), flagName);
  const value = assertNonEmptyString(rawPair.slice(delimiterIndex + 1), `${flagName} value`);
  return { key, value };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function parseInputRows(raw: unknown, sourcePath: string): unknown[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Input source rows must be a non-empty JSON array: ${sourcePath}`);
  }
  return raw;
}

function toPathSafeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-");
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

function assertRunnerExists(filePath: string, runnerLabel: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${runnerLabel} runner does not exist: ${filePath}`);
  }
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envOverrides?: Record<string, string>
): string {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: envOverrides ? { ...process.env, ...envOverrides } : process.env,
    });
    return typeof stdout === "string" ? stdout.trim() : "";
  } catch (error: unknown) {
    const processError = error as NodeJS.ErrnoException & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      status?: number | null;
    };
    const stdout =
      typeof processError.stdout === "string"
        ? processError.stdout.trim()
        : Buffer.isBuffer(processError.stdout)
          ? processError.stdout.toString("utf8").trim()
          : "";
    const stderr =
      typeof processError.stderr === "string"
        ? processError.stderr.trim()
        : Buffer.isBuffer(processError.stderr)
          ? processError.stderr.toString("utf8").trim()
          : "";
    const exitCode = processError.status ?? null;

    throw new Error(
      [
        `Script execution failed: node ${toWorkspacePath(scriptPath)} ${args.join(" ")}`,
        exitCode === null ? "" : `exitCode: ${String(exitCode)}`,
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

function parseDeploymentBundle(raw: unknown, sourcePath: string): SchedulerDeploymentBundle {
  if (!isPlainObject(raw)) {
    throw new Error(`Deployment bundle must be a JSON object: ${sourcePath}`);
  }

  if (raw.module !== MODULE_ID || raw.phase !== "EVALUATION" || raw.kpiId !== KPI_ID) {
    throw new Error(`Unexpected deployment bundle identity in ${sourcePath}.`);
  }
  if (raw.artifact !== "scheduler_deployment_bundle") {
    throw new Error(`Unexpected deployment bundle artifact in ${sourcePath}.`);
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error(`deploymentBundle.secrets must be an object in ${sourcePath}.`);
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error(`deploymentBundle.verification must be an object in ${sourcePath}.`);
  }

  const requiredEnvKeys = parseStringArray(
    raw.secrets.requiredEnvKeys,
    "deploymentBundle.secrets.requiredEnvKeys"
  ).map((entry, index) =>
    assertEnvironmentVariableName(entry, `deploymentBundle.secrets.requiredEnvKeys[${index}]`)
  );

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_deployment_bundle",
    generatedAt: assertNonEmptyString(raw.generatedAt, "deploymentBundle.generatedAt"),
    secrets: {
      requiredEnvKeys,
      failureWebhookEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          raw.secrets.failureWebhookEnvKey,
          "deploymentBundle.secrets.failureWebhookEnvKey"
        ),
        "deploymentBundle.secrets.failureWebhookEnvKey"
      ),
      failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          raw.secrets.failureWebhookTimeoutEnvKey,
          "deploymentBundle.secrets.failureWebhookTimeoutEnvKey"
        ),
        "deploymentBundle.secrets.failureWebhookTimeoutEnvKey"
      ),
    },
    verification: {
      expectedOutputs: parseStringArray(
        raw.verification.expectedOutputs,
        "deploymentBundle.verification.expectedOutputs"
      ),
    },
  };
}

function parseDryRunReport(raw: unknown, sourcePath: string): SchedulerDryRunReport {
  if (!isPlainObject(raw)) {
    throw new Error(`Dry-run report must be a JSON object: ${sourcePath}`);
  }

  if (raw.module !== MODULE_ID || raw.phase !== "EVALUATION" || raw.kpiId !== KPI_ID) {
    throw new Error(`Unexpected dry-run report identity in ${sourcePath}.`);
  }
  if (raw.artifact !== "scheduler_dry_run_report") {
    throw new Error(`Unexpected dry-run report artifact in ${sourcePath}.`);
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error(`dryRunReport.verification must be an object in ${sourcePath}.`);
  }
  if (!isPlainObject(raw.dryRun)) {
    throw new Error(`dryRunReport.dryRun must be an object in ${sourcePath}.`);
  }

  const expectedOutputs = raw.verification.expectedOutputs;
  if (
    !Array.isArray(expectedOutputs) ||
    expectedOutputs.some(
      (entry) =>
        !isPlainObject(entry) ||
        typeof entry.path !== "string" ||
        typeof entry.exists !== "boolean"
    )
  ) {
    throw new Error(
      `dryRunReport.verification.expectedOutputs must be an array of { path, exists } in ${sourcePath}.`
    );
  }

  if (typeof raw.verification.allExpectedOutputsPresent !== "boolean") {
    throw new Error(
      `dryRunReport.verification.allExpectedOutputsPresent must be boolean in ${sourcePath}.`
    );
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_dry_run_report",
    verification: {
      allExpectedOutputsPresent: raw.verification.allExpectedOutputsPresent,
      expectedOutputs: expectedOutputs.map((entry) => ({
        path: entry.path,
        exists: entry.exists,
      })),
    },
    dryRun: {
      missingRequiredEnvKeys: parseStringArray(
        raw.dryRun.missingRequiredEnvKeys,
        "dryRunReport.dryRun.missingRequiredEnvKeys"
      ),
    },
  };
}

function buildRepresentativeSourceRows(windowEnd: string, rowCount: number): OpsAdverseEventRow[] {
  const windowEndMs = Date.parse(windowEnd);
  return Array.from({ length: rowCount }, (_, index) => {
    const ordinal = index + 1;
    const reportedAt = new Date(windowEndMs - (index * 20 + 5) * DAY_IN_MS).toISOString();
    return {
      event_id: `pv-event-${String(ordinal).padStart(4, "0")}`,
      case_id: `pv-case-${String(ordinal).padStart(4, "0")}`,
      reported_at: reportedAt,
      linked_to_engine_recommendation: ordinal <= 4 ? "yes" : "no",
    };
  });
}

function buildDefaultSecretRef(envKey: string): string {
  return `secret://rnd/module03/kpi06/${envKey.toLowerCase()}`;
}

function buildSecretBindingMap(
  requiredEnvKeys: string[],
  explicitPairs: string[]
): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const envKey of requiredEnvKeys) {
    bindings.set(envKey, buildDefaultSecretRef(envKey));
  }

  for (const rawPair of explicitPairs) {
    const parsedPair = parseKeyValuePair(rawPair, "--secret-binding");
    bindings.set(parsedPair.key, parsedPair.value);
  }

  return bindings;
}

function buildRuntimeEnvValues(
  bundle: SchedulerDeploymentBundle,
  explicitPairs: string[]
): Map<string, string> {
  const runtimeValues = new Map<string, string>();

  for (const envKey of bundle.secrets.requiredEnvKeys) {
    if (envKey === bundle.secrets.failureWebhookEnvKey) {
      runtimeValues.set(envKey, "https://example.com/rnd/module03/kpi06/failure-webhook");
      continue;
    }
    if (envKey === bundle.secrets.failureWebhookTimeoutEnvKey) {
      runtimeValues.set(envKey, "3000");
      continue;
    }
    runtimeValues.set(envKey, `simulated-${envKey.toLowerCase()}`);
  }

  for (const rawPair of explicitPairs) {
    const parsedPair = parseKeyValuePair(rawPair, "--env-value");
    runtimeValues.set(parsedPair.key, parsedPair.value);
  }

  return runtimeValues;
}

function parseArgs(argv: string[]): CliArgs {
  const windowEnd = normalizeIsoDateTime(
    getArgValue(argv, "--window-end") ?? new Date().toISOString(),
    "--window-end"
  );
  const defaultOutDir = path.join(
    DEFAULT_OUT_DIR_ROOT,
    toMonthToken(windowEnd),
    `run-${toPathSafeTimestamp(new Date().toISOString())}`
  );
  const outDir = path.resolve(getArgValue(argv, "--out-dir") ?? defaultOutDir);

  const inputPathValue = getArgValue(argv, "--input");
  const inputPath = inputPathValue ? path.resolve(inputPathValue) : null;
  if (inputPath && !fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  const sampleRowCount = parsePositiveInteger(
    getArgValue(argv, "--sample-row-count") ?? String(DEFAULT_SAMPLE_ROW_COUNT),
    "--sample-row-count"
  );

  const schedulerName = assertNonEmptyString(
    getArgValue(argv, "--scheduler-name") ?? DEFAULT_SCHEDULER_NAME,
    "--scheduler-name"
  );
  const environment = assertNonEmptyString(
    getArgValue(argv, "--environment") ?? DEFAULT_ENVIRONMENT,
    "--environment"
  );

  return {
    outDir,
    windowEnd,
    inputPath,
    requiredEnvKeys: parseRequiredEnvKeys(getArgValue(argv, "--require-env")),
    schedulerName,
    environment,
    strictEnv: !hasFlag(argv, "--no-strict-env"),
    sampleRowCount,
    secretBindingPairs: getArgValues(argv, "--secret-binding"),
    envValuePairs: getArgValues(argv, "--env-value"),
  };
}

function main() {
  assertRunnerExists(BUNDLE_RUNNER_PATH, "Module 03 deployment-bundle");
  assertRunnerExists(INFRA_BINDING_RUNNER_PATH, "Module 03 infra-binding");
  assertRunnerExists(DRY_RUN_RUNNER_PATH, "Module 03 scheduler dry-run");

  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const archiveDir = path.join(args.outDir, "archive");
  const handoffDir = path.join(args.outDir, "handoff");
  const failureAlertDir = path.join(args.outDir, "failure-alerts");
  const bundlePath = path.join(args.outDir, "scheduler-deployment-bundle.json");
  const infraBindingPath = path.join(args.outDir, "scheduler-infra-binding.json");
  const dryRunReportPath = path.join(args.outDir, "scheduler-dry-run-report.json");
  const summaryPath = path.join(args.outDir, "scheduler-handoff-validation.json");
  const generatedInputPath = path.join(args.outDir, "representative-export-window.json");

  const inputRows = args.inputPath
    ? parseInputRows(readJsonFile(args.inputPath), args.inputPath)
    : buildRepresentativeSourceRows(args.windowEnd, args.sampleRowCount);

  const resolvedInputPath = args.inputPath ?? generatedInputPath;
  if (!args.inputPath) {
    writeJsonFile(generatedInputPath, inputRows);
  }

  const bundleArgs = [
    "--out",
    bundlePath,
    "--archive-dir",
    archiveDir,
    "--handoff-dir",
    handoffDir,
    "--failure-alert-dir",
    failureAlertDir,
    "--require-env",
    args.requiredEnvKeys.join(","),
    "--generated-at",
    new Date().toISOString(),
  ];
  runNodeScript(BUNDLE_RUNNER_PATH, bundleArgs);

  const deploymentBundleRaw = readJsonFile(bundlePath);
  const deploymentBundle = parseDeploymentBundle(deploymentBundleRaw, bundlePath);
  const secretBindingMap = buildSecretBindingMap(
    deploymentBundle.secrets.requiredEnvKeys,
    args.secretBindingPairs
  );
  const sortedRequiredEnvKeys = [...deploymentBundle.secrets.requiredEnvKeys].sort();

  const infraBindingArgs = [
    "--bundle",
    bundlePath,
    "--out",
    infraBindingPath,
    "--scheduler-name",
    args.schedulerName,
    "--environment",
    args.environment,
  ];
  for (const envKey of sortedRequiredEnvKeys) {
    infraBindingArgs.push("--secret-binding", `${envKey}=${secretBindingMap.get(envKey) as string}`);
  }
  runNodeScript(INFRA_BINDING_RUNNER_PATH, infraBindingArgs);

  const runtimeEnvValueMap = buildRuntimeEnvValues(deploymentBundle, args.envValuePairs);
  const runtimeEnvOverrides: Record<string, string> = {};
  for (const [envKey, envValue] of runtimeEnvValueMap.entries()) {
    runtimeEnvOverrides[envKey] = envValue;
  }

  const dryRunArgs = [
    "--infra-binding",
    infraBindingPath,
    "--input",
    resolvedInputPath,
    "--window-end",
    args.windowEnd,
    "--out",
    dryRunReportPath,
  ];
  if (args.strictEnv) {
    dryRunArgs.push("--strict-env");
  }
  runNodeScript(DRY_RUN_RUNNER_PATH, dryRunArgs, runtimeEnvOverrides);

  const dryRunReportRaw = readJsonFile(dryRunReportPath);
  const dryRunReport = parseDryRunReport(dryRunReportRaw, dryRunReportPath);
  if (!dryRunReport.verification.allExpectedOutputsPresent) {
    throw new Error("Dry-run verification failed: expected outputs were not all present.");
  }

  const summary: Module03SchedulerHandoffValidationSummary = {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_handoff_validation",
    generatedAt: new Date().toISOString(),
    windowEnd: args.windowEnd,
    strictEnv: args.strictEnv,
    scheduler: {
      name: args.schedulerName,
      environment: args.environment,
    },
    input: {
      source: args.inputPath ? "provided_input" : "generated_representative_window",
      path: toWorkspacePath(resolvedInputPath),
      rowCount: Array.isArray(inputRows) ? inputRows.length : 0,
    },
    secrets: {
      requiredEnvKeys: sortedRequiredEnvKeys,
      boundSecretRefs: sortedRequiredEnvKeys.map((envKey) => ({
        envKey,
        secretRef: secretBindingMap.get(envKey) as string,
      })),
      runtimeEnvKeysInjected: [...runtimeEnvValueMap.keys()].sort(),
    },
    artifacts: {
      outDir: toWorkspacePath(args.outDir),
      deploymentBundlePath: toWorkspacePath(bundlePath),
      infraBindingPath: toWorkspacePath(infraBindingPath),
      dryRunReportPath: toWorkspacePath(dryRunReportPath),
    },
    verification: {
      expectedOutputs: dryRunReport.verification.expectedOutputs,
      allExpectedOutputsPresent: dryRunReport.verification.allExpectedOutputsPresent,
      missingRequiredEnvKeys: dryRunReport.dryRun.missingRequiredEnvKeys,
    },
  };

  writeJsonFile(summaryPath, summary);
  console.log(
    `Wrote Module 03 KPI #6 scheduler handoff validation summary: ${toWorkspacePath(summaryPath)}`
  );
}

main();
