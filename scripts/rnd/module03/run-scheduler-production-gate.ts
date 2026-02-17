// RND: Module 03 KPI #6 scheduler production gate runner (handoff + readiness).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type CliArgs = {
  outDir: string;
  windowEnd: string;
  inputPath: string | null;
  requireProvidedInput: boolean;
  requiredEnvKeysCsv: string | null;
  schedulerName: string | null;
  environment: string;
  expectedEnvironment: string;
  strictEnv: boolean;
  sampleRowCount: number | null;
  secretBindingPairs: string[];
  envValuePairs: string[];
  allowRndDefaultSecretRefs: boolean;
};

type CommandRunResult = {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  succeeded: boolean;
};

type SchedulerProductionReadinessReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_readiness_report";
  result: "pass" | "fail";
  failures: string[];
};

type Module03SchedulerProductionGateArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_gate";
  generatedAt: string;
  result: "pass" | "fail";
  expectedEnvironment: string;
  environment: string;
  inputs: {
    outDir: string;
    windowEnd: string;
    inputPath: string | null;
    requireProvidedInput: boolean;
  };
  artifacts: {
    handoffSummaryPath: string;
    readinessReportPath: string;
  };
  commands: {
    handoffValidation: Pick<CommandRunResult, "command" | "exitCode" | "succeeded">;
    readinessValidation: Pick<CommandRunResult, "command" | "exitCode" | "succeeded">;
  };
  readiness: {
    reportResult: "pass" | "fail" | "missing";
    failures: string[];
  };
};

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const DEFAULT_ENVIRONMENT = "production-like";
const DEFAULT_OUT_DIR_ROOT = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-production-gate"
);
const HANDOFF_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-scheduler-handoff-validation.cjs"
);
const READINESS_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-validate-scheduler-production-readiness.cjs"
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

function parseRequiredEnvKeysCsv(value: string): string {
  const keys = [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
  if (keys.length === 0) {
    throw new Error("--require-env must include at least one environment variable name.");
  }
  for (const key of keys) {
    assertEnvironmentVariableName(key, "--require-env");
  }
  return keys.join(",");
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function runNodeScript(scriptPath: string, args: string[]): CommandRunResult {
  const command = `node ${toWorkspacePath(scriptPath)} ${args.join(" ")}`.trim();

  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    return {
      command,
      exitCode: 0,
      stdout: typeof stdout === "string" ? stdout.trim() : "",
      stderr: "",
      succeeded: true,
    };
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

    return {
      command,
      exitCode,
      stdout,
      stderr,
      succeeded: false,
    };
  }
}

function formatCommandFailure(result: CommandRunResult): string {
  return [
    `Script execution failed: ${result.command}`,
    result.exitCode === null ? "" : `exitCode: ${String(result.exitCode)}`,
    result.stdout.length > 0 ? `stdout: ${result.stdout}` : "",
    result.stderr.length > 0 ? `stderr: ${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseReadinessReport(
  raw: unknown,
  sourcePath: string
): SchedulerProductionReadinessReport {
  if (!isPlainObject(raw)) {
    throw new Error(`Readiness report must be a JSON object: ${sourcePath}`);
  }
  if (
    raw.module !== MODULE_ID ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== KPI_ID ||
    raw.artifact !== "scheduler_production_readiness_report"
  ) {
    throw new Error(`Unexpected readiness report identity: ${sourcePath}`);
  }
  if (raw.result !== "pass" && raw.result !== "fail") {
    throw new Error(`readinessReport.result must be "pass" or "fail": ${sourcePath}`);
  }
  if (!Array.isArray(raw.failures) || raw.failures.some((entry) => typeof entry !== "string")) {
    throw new Error(`readinessReport.failures must be a string array: ${sourcePath}`);
  }

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_production_readiness_report",
    result: raw.result,
    failures: raw.failures,
  };
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
  const requireProvidedInput = hasFlag(argv, "--require-provided-input");
  if (requireProvidedInput && !inputPath) {
    throw new Error(
      "--require-provided-input was set but --input is missing. Provide an exported production window JSON file."
    );
  }

  const requiredEnvRaw = getArgValue(argv, "--require-env");
  const requiredEnvKeysCsv = requiredEnvRaw ? parseRequiredEnvKeysCsv(requiredEnvRaw) : null;

  const schedulerNameRaw = getArgValue(argv, "--scheduler-name");
  const schedulerName = schedulerNameRaw
    ? assertNonEmptyString(schedulerNameRaw, "--scheduler-name")
    : null;

  const environment = assertNonEmptyString(
    getArgValue(argv, "--environment") ?? DEFAULT_ENVIRONMENT,
    "--environment"
  );
  const expectedEnvironment = assertNonEmptyString(
    getArgValue(argv, "--expected-environment") ?? environment,
    "--expected-environment"
  );

  const sampleRowCountValue = getArgValue(argv, "--sample-row-count");
  const sampleRowCount = sampleRowCountValue
    ? parsePositiveInteger(sampleRowCountValue, "--sample-row-count")
    : null;

  const secretBindingPairs = getArgValues(argv, "--secret-binding");
  for (const pair of secretBindingPairs) {
    parseKeyValuePair(pair, "--secret-binding");
  }

  const envValuePairs = getArgValues(argv, "--env-value");
  for (const pair of envValuePairs) {
    parseKeyValuePair(pair, "--env-value");
  }

  return {
    outDir,
    windowEnd,
    inputPath,
    requireProvidedInput,
    requiredEnvKeysCsv,
    schedulerName,
    environment,
    expectedEnvironment,
    strictEnv: !hasFlag(argv, "--no-strict-env"),
    sampleRowCount,
    secretBindingPairs,
    envValuePairs,
    allowRndDefaultSecretRefs: hasFlag(argv, "--allow-rnd-default-secret-ref"),
  };
}

function main(): void {
  assertRunnerExists(HANDOFF_RUNNER_PATH, "Module 03 scheduler handoff validation");
  assertRunnerExists(READINESS_RUNNER_PATH, "Module 03 scheduler production readiness");

  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const handoffOutDir = path.join(args.outDir, "handoff-validation");
  const handoffSummaryPath = path.join(handoffOutDir, "scheduler-handoff-validation.json");
  const readinessReportPath = path.join(args.outDir, "scheduler-production-readiness-report.json");
  const gateArtifactPath = path.join(args.outDir, "scheduler-production-gate.json");

  const handoffArgs = ["--out-dir", handoffOutDir, "--window-end", args.windowEnd, "--environment", args.environment];
  if (args.inputPath) {
    handoffArgs.push("--input", args.inputPath);
  }
  if (args.requiredEnvKeysCsv) {
    handoffArgs.push("--require-env", args.requiredEnvKeysCsv);
  }
  if (args.schedulerName) {
    handoffArgs.push("--scheduler-name", args.schedulerName);
  }
  if (args.sampleRowCount !== null) {
    handoffArgs.push("--sample-row-count", String(args.sampleRowCount));
  }
  if (!args.strictEnv) {
    handoffArgs.push("--no-strict-env");
  }
  for (const pair of args.secretBindingPairs) {
    handoffArgs.push("--secret-binding", pair);
  }
  for (const pair of args.envValuePairs) {
    handoffArgs.push("--env-value", pair);
  }

  const handoffResult = runNodeScript(HANDOFF_RUNNER_PATH, handoffArgs);
  if (!handoffResult.succeeded) {
    throw new Error(formatCommandFailure(handoffResult));
  }
  if (!fs.existsSync(handoffSummaryPath)) {
    throw new Error(
      `Handoff summary artifact was not generated: ${toWorkspacePath(handoffSummaryPath)}`
    );
  }

  const readinessArgs = [
    "--summary",
    handoffSummaryPath,
    "--out",
    readinessReportPath,
    "--expected-environment",
    args.expectedEnvironment,
  ];
  if (args.allowRndDefaultSecretRefs) {
    readinessArgs.push("--allow-rnd-default-secret-ref");
  }
  if (args.requireProvidedInput) {
    readinessArgs.push("--require-provided-input");
  }

  const readinessResult = runNodeScript(READINESS_RUNNER_PATH, readinessArgs);
  const readinessReport = fs.existsSync(readinessReportPath)
    ? parseReadinessReport(readJsonFile(readinessReportPath), readinessReportPath)
    : null;

  const gateArtifact: Module03SchedulerProductionGateArtifact = {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_production_gate",
    generatedAt: new Date().toISOString(),
    result: readinessReport?.result ?? (readinessResult.succeeded ? "pass" : "fail"),
    expectedEnvironment: args.expectedEnvironment,
    environment: args.environment,
    inputs: {
      outDir: toWorkspacePath(args.outDir),
      windowEnd: args.windowEnd,
      inputPath: args.inputPath ? toWorkspacePath(args.inputPath) : null,
      requireProvidedInput: args.requireProvidedInput,
    },
    artifacts: {
      handoffSummaryPath: toWorkspacePath(handoffSummaryPath),
      readinessReportPath: toWorkspacePath(readinessReportPath),
    },
    commands: {
      handoffValidation: {
        command: handoffResult.command,
        exitCode: handoffResult.exitCode,
        succeeded: handoffResult.succeeded,
      },
      readinessValidation: {
        command: readinessResult.command,
        exitCode: readinessResult.exitCode,
        succeeded: readinessResult.succeeded,
      },
    },
    readiness: {
      reportResult: readinessReport?.result ?? "missing",
      failures: readinessReport?.failures ?? [],
    },
  };

  writeJsonFile(gateArtifactPath, gateArtifact);

  if (!readinessResult.succeeded || gateArtifact.result !== "pass") {
    const details = formatCommandFailure(readinessResult);
    throw new Error(
      [
        `Wrote Module 03 KPI #6 scheduler production gate artifact (FAIL): ${toWorkspacePath(gateArtifactPath)}`,
        details,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  console.log(
    `Wrote Module 03 KPI #6 scheduler production gate artifact (PASS): ${toWorkspacePath(gateArtifactPath)}`
  );
}

main();
