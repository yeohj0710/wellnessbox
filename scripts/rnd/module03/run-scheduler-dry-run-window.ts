// RND: Module 03 KPI #6 scheduler dry-run window runner from infra-binding artifacts.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  readJsonFile,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  buildDefaultOutPath,
  buildSchedulerArgs,
  KPI_ID,
  MODULE_ID,
  parseCliArgs,
  parseInfraBindingArtifact,
  verifyExpectedOutputs,
} from "./scheduler-dry-run-artifacts";

type SchedulerRunResult = {
  stdout: string;
  stderr: string;
};

const SCHEDULER_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-scheduler.cjs"
);

function assertSchedulerRunnerExists(): void {
  if (!fs.existsSync(SCHEDULER_RUNNER_PATH)) {
    throw new Error(`Scheduler runner does not exist: ${SCHEDULER_RUNNER_PATH}`);
  }
}

function toProcessOutput(value: string | Buffer | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8").trim();
  }
  return "";
}

function buildDryRunExecutionError(
  processError: NodeJS.ErrnoException & {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
    status?: number | null;
  },
  schedulerArgs: string[]
): Error {
  const stdout = toProcessOutput(processError.stdout);
  const stderr = toProcessOutput(processError.stderr);
  const exitCode = processError.status ?? null;

  return new Error(
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

function runSchedulerDryRun(schedulerArgs: string[]): SchedulerRunResult {
  assertSchedulerRunnerExists();

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
    throw buildDryRunExecutionError(processError, schedulerArgs);
  }
}

function main(): void {
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

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
