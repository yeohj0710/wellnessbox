// RND: Module 03 KPI #6 scheduler production gate runner (handoff + readiness).

import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  isPlainObject,
  normalizeIsoDate,
  parseRequiredEnvKeys as parseRequiredEnvKeysOrThrow,
  readJsonFile,
  toMonthToken,
  toPathSafeTimestamp,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  assertEnvironmentVariableName,
  getArgValues,
  hasFlag,
  parseKeyValuePair,
  parsePositiveInteger,
} from "./cli-helpers";
import {
  assertRunnerExists,
  formatCommandFailure,
  runNodeScript,
  type NodeScriptRunResult as CommandRunResult,
} from "./node-script-runner";

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

function parseRequiredEnvKeysCsv(value: string): string {
  return parseRequiredEnvKeysOrThrow(value, "--require-env").join(",");
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
  const windowEnd = normalizeIsoDate(
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
