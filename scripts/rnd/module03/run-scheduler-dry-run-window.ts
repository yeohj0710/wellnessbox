// RND: Module 03 KPI #6 scheduler dry-run window runner from infra-binding artifacts.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  isPlainObject,
  normalizeIsoDate,
  readJsonFile,
  toMonthToken,
  toPathSafeTimestamp,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  assertEnvironmentVariableName,
  hasFlag,
  parsePositiveInteger,
} from "./cli-helpers";

type CliArgs = {
  infraBindingPath: string;
  inputPath: string;
  outPath: string | null;
  windowEnd: string;
  strictEnv: boolean;
};

type Module03SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  scheduler: {
    commandArgs: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
  };
  warehouse: {
    schemaMapPath: string;
  };
  artifacts: {
    archiveDir: string;
    handoffDir: string;
    failureAlertDir: string;
  };
  verification: {
    expectedOutputs: string[];
  };
};

type DryRunOutputVerification = {
  path: string;
  exists: boolean;
};

type SchedulerRunResult = {
  stdout: string;
  stderr: string;
};

const MODULE_ID = "03_personal_safety_validation_engine";
const KPI_ID = "kpi-06";
const SCHEDULER_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-scheduler.cjs"
);
const DEFAULT_DRY_RUN_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-dry-run"
);

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function resolveArtifactPath(value: string): string {
  const normalized = value.replace(/\//g, path.sep);
  if (path.isAbsolute(normalized)) {
    return normalized;
  }
  return path.resolve(process.cwd(), normalized);
}

function parseCliArgs(argv: string[]): CliArgs {
  const infraBindingPathValue = getArgValue(argv, "--infra-binding");
  if (!infraBindingPathValue) {
    throw new Error("--infra-binding is required.");
  }
  const infraBindingPath = path.resolve(infraBindingPathValue);
  if (!fs.existsSync(infraBindingPath)) {
    throw new Error(`--infra-binding file does not exist: ${infraBindingPath}`);
  }

  const inputPathValue = getArgValue(argv, "--input");
  if (!inputPathValue) {
    throw new Error("--input is required and must point to a pre-exported JSON array.");
  }
  const inputPath = path.resolve(inputPathValue);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  const outPathValue = getArgValue(argv, "--out");
  const windowEnd = normalizeIsoDate(
    getArgValue(argv, "--window-end") ?? new Date().toISOString(),
    "--window-end"
  );

  return {
    infraBindingPath,
    inputPath,
    outPath: outPathValue ? path.resolve(outPathValue) : null,
    windowEnd,
    strictEnv: hasFlag(argv, "--strict-env"),
  };
}

function parseInfraBindingArtifact(
  raw: unknown,
  sourcePath: string
): Module03SchedulerInfraBindingArtifact {
  if (!isPlainObject(raw)) {
    throw new Error(`Infra binding file must be a JSON object: ${sourcePath}`);
  }

  if (raw.module !== MODULE_ID) {
    throw new Error(`infraBinding.module must be "${MODULE_ID}".`);
  }
  if (raw.phase !== "EVALUATION") {
    throw new Error('infraBinding.phase must be "EVALUATION".');
  }
  if (raw.kpiId !== KPI_ID) {
    throw new Error(`infraBinding.kpiId must be "${KPI_ID}".`);
  }
  if (raw.artifact !== "scheduler_infra_binding") {
    throw new Error('infraBinding.artifact must be "scheduler_infra_binding".');
  }

  if (!isPlainObject(raw.scheduler)) {
    throw new Error("infraBinding.scheduler must be an object.");
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error("infraBinding.secrets must be an object.");
  }
  if (!isPlainObject(raw.warehouse)) {
    throw new Error("infraBinding.warehouse must be an object.");
  }
  if (!isPlainObject(raw.artifacts)) {
    throw new Error("infraBinding.artifacts must be an object.");
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error("infraBinding.verification must be an object.");
  }

  const requiredEnvKeys = parseStringArray(raw.secrets.requiredEnvKeys, "infraBinding.secrets.requiredEnvKeys")
    .map((entry, index) =>
      assertEnvironmentVariableName(entry, `infraBinding.secrets.requiredEnvKeys[${index}]`)
    );

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_infra_binding",
    scheduler: {
      commandArgs: parseStringArray(raw.scheduler.commandArgs, "infraBinding.scheduler.commandArgs"),
    },
    secrets: {
      requiredEnvKeys,
      failureWebhookEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          raw.secrets.failureWebhookEnvKey,
          "infraBinding.secrets.failureWebhookEnvKey"
        ),
        "infraBinding.secrets.failureWebhookEnvKey"
      ),
      failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
        assertNonEmptyString(
          raw.secrets.failureWebhookTimeoutEnvKey,
          "infraBinding.secrets.failureWebhookTimeoutEnvKey"
        ),
        "infraBinding.secrets.failureWebhookTimeoutEnvKey"
      ),
    },
    warehouse: {
      schemaMapPath: assertNonEmptyString(
        raw.warehouse.schemaMapPath,
        "infraBinding.warehouse.schemaMapPath"
      ),
    },
    artifacts: {
      archiveDir: assertNonEmptyString(raw.artifacts.archiveDir, "infraBinding.artifacts.archiveDir"),
      handoffDir: assertNonEmptyString(raw.artifacts.handoffDir, "infraBinding.artifacts.handoffDir"),
      failureAlertDir: assertNonEmptyString(
        raw.artifacts.failureAlertDir,
        "infraBinding.artifacts.failureAlertDir"
      ),
    },
    verification: {
      expectedOutputs: parseStringArray(
        raw.verification.expectedOutputs,
        "infraBinding.verification.expectedOutputs"
      ),
    },
  };
}

function readSchedulerFlagValue(commandArgs: string[], flag: string): string | null {
  for (let index = 0; index < commandArgs.length; index += 1) {
    if (commandArgs[index] !== flag) {
      continue;
    }
    const value = commandArgs[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Infra-binding scheduler command arg ${flag} is missing a value.`);
    }
    return value;
  }
  return null;
}

function getMissingRequiredEnvKeys(requiredEnvKeys: string[]): string[] {
  return requiredEnvKeys.filter((envKey) => {
    const value = process.env[envKey];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function buildSchedulerArgs(
  args: CliArgs,
  infraBinding: Module03SchedulerInfraBindingArtifact
): {
  schedulerArgs: string[];
  missingRequiredEnvKeys: string[];
  appliedRetentionMonths: number | null;
} {
  const schemaMapPath = resolveArtifactPath(infraBinding.warehouse.schemaMapPath);
  if (!fs.existsSync(schemaMapPath)) {
    throw new Error(`Schema map path from infra binding does not exist: ${schemaMapPath}`);
  }

  const archiveDir = resolveArtifactPath(infraBinding.artifacts.archiveDir);
  const handoffDir = resolveArtifactPath(infraBinding.artifacts.handoffDir);
  const failureAlertDir = resolveArtifactPath(infraBinding.artifacts.failureAlertDir);
  const schedulerArgs = [
    "--input",
    args.inputPath,
    "--schema-map",
    schemaMapPath,
    "--archive-dir",
    archiveDir,
    "--handoff-dir",
    handoffDir,
    "--failure-alert-dir",
    failureAlertDir,
    "--window-end",
    args.windowEnd,
  ];

  const retentionMonthsValue = readSchedulerFlagValue(
    infraBinding.scheduler.commandArgs,
    "--retention-months"
  );
  const appliedRetentionMonths = retentionMonthsValue
    ? parsePositiveInteger(retentionMonthsValue, "infraBinding.scheduler.commandArgs(--retention-months)")
    : null;
  if (appliedRetentionMonths !== null) {
    schedulerArgs.push("--retention-months", String(appliedRetentionMonths));
  }

  const missingRequiredEnvKeys = getMissingRequiredEnvKeys(infraBinding.secrets.requiredEnvKeys);
  if (args.strictEnv && missingRequiredEnvKeys.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingRequiredEnvKeys.join(", ")}.`
    );
  }
  if (args.strictEnv && infraBinding.secrets.requiredEnvKeys.length > 0) {
    schedulerArgs.push("--require-env", infraBinding.secrets.requiredEnvKeys.join(","));
  }

  const failureWebhookUrlValue = process.env[infraBinding.secrets.failureWebhookEnvKey]?.trim();
  if (failureWebhookUrlValue) {
    schedulerArgs.push("--failure-webhook-url", failureWebhookUrlValue);
  }
  const failureWebhookTimeoutValue =
    process.env[infraBinding.secrets.failureWebhookTimeoutEnvKey]?.trim();
  if (failureWebhookTimeoutValue) {
    const timeoutMs = parsePositiveInteger(
      failureWebhookTimeoutValue,
      `env:${infraBinding.secrets.failureWebhookTimeoutEnvKey}`
    );
    schedulerArgs.push("--failure-webhook-timeout-ms", String(timeoutMs));
  }

  return {
    schedulerArgs,
    missingRequiredEnvKeys,
    appliedRetentionMonths,
  };
}

function runSchedulerDryRun(schedulerArgs: string[]): SchedulerRunResult {
  if (!fs.existsSync(SCHEDULER_RUNNER_PATH)) {
    throw new Error(`Scheduler runner does not exist: ${SCHEDULER_RUNNER_PATH}`);
  }

  try {
    const stdout = execFileSync(process.execPath, [SCHEDULER_RUNNER_PATH, ...schedulerArgs], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      stdout: typeof stdout === "string" ? stdout.trim() : "",
      stderr: "",
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
    throw new Error(
      [
        "Module 03 KPI #6 dry-run scheduler execution failed.",
        `Command: node ${toWorkspacePath(SCHEDULER_RUNNER_PATH)} ${schedulerArgs.join(" ")}`,
        exitCode !== null ? `exitCode: ${String(exitCode)}` : "",
        stdout.length > 0 ? `stdout: ${stdout}` : "",
        stderr.length > 0 ? `stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

function verifyExpectedOutputs(
  infraBinding: Module03SchedulerInfraBindingArtifact
): DryRunOutputVerification[] {
  return infraBinding.verification.expectedOutputs.map((outputPath) => {
    const absolutePath = resolveArtifactPath(outputPath);
    return {
      path: toWorkspacePath(absolutePath),
      exists: fs.existsSync(absolutePath),
    };
  });
}

function buildDefaultOutPath(windowEnd: string): string {
  const generatedAt = new Date().toISOString();
  return path.join(
    DEFAULT_DRY_RUN_DIR,
    toMonthToken(windowEnd),
    `kpi06-scheduler-dry-run-${toPathSafeTimestamp(generatedAt)}.json`
  );
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const rawInfraBinding = readJsonFile(args.infraBindingPath);
  const infraBinding = parseInfraBindingArtifact(rawInfraBinding, args.infraBindingPath);
  const schedulerPlan = buildSchedulerArgs(args, infraBinding);

  const schedulerRunResult = runSchedulerDryRun(schedulerPlan.schedulerArgs);
  const outputVerification = verifyExpectedOutputs(infraBinding);
  const missingOutputs = outputVerification.filter((entry) => !entry.exists);
  if (missingOutputs.length > 0) {
    throw new Error(
      `Expected dry-run output(s) were not created: ${missingOutputs
        .map((entry) => entry.path)
        .join(", ")}`
    );
  }

  const outPath = args.outPath ?? buildDefaultOutPath(args.windowEnd);
  const report = {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_dry_run_report",
    generatedAt: new Date().toISOString(),
    sourceInfraBindingPath: toWorkspacePath(args.infraBindingPath),
    dryRun: {
      inputPath: toWorkspacePath(args.inputPath),
      windowEnd: args.windowEnd,
      strictEnv: args.strictEnv,
      requiredEnvKeys: infraBinding.secrets.requiredEnvKeys,
      missingRequiredEnvKeys: schedulerPlan.missingRequiredEnvKeys,
      appliedRetentionMonths: schedulerPlan.appliedRetentionMonths,
    },
    scheduler: {
      runnerPath: toWorkspacePath(SCHEDULER_RUNNER_PATH),
      args: schedulerPlan.schedulerArgs,
      stdout: schedulerRunResult.stdout,
      stderr: schedulerRunResult.stderr,
    },
    verification: {
      expectedOutputs: outputVerification,
      allExpectedOutputsPresent: true,
    },
  };

  writeJsonFile(outPath, report);
  console.log(`Wrote Module 03 KPI #6 scheduler dry-run report: ${toWorkspacePath(outPath)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
