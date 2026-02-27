import fs from "node:fs";
import path from "node:path";
import { readJsonFile, toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  assertRunnerExists,
  formatCommandFailure,
  runNodeScript,
  type NodeScriptRunResult as CommandRunResult,
} from "./node-script-runner";
import { parseReadinessReport } from "./scheduler-production-gate-artifacts";
import type {
  CliArgs,
  ProductionGatePaths,
  SchedulerProductionReadinessReport,
} from "./scheduler-production-gate-types";

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

export function assertProductionGateRunnersAvailable(): void {
  assertRunnerExists(HANDOFF_RUNNER_PATH, "Module 03 scheduler handoff validation");
  assertRunnerExists(READINESS_RUNNER_PATH, "Module 03 scheduler production readiness");
}

export function buildProductionGatePaths(outDir: string): ProductionGatePaths {
  const handoffOutDir = path.join(outDir, "handoff-validation");
  return {
    handoffOutDir,
    handoffSummaryPath: path.join(handoffOutDir, "scheduler-handoff-validation.json"),
    readinessReportPath: path.join(outDir, "scheduler-production-readiness-report.json"),
    gateArtifactPath: path.join(outDir, "scheduler-production-gate.json"),
  };
}

function buildHandoffArgs(args: CliArgs, handoffOutDir: string): string[] {
  const handoffArgs = [
    "--out-dir",
    handoffOutDir,
    "--window-end",
    args.windowEnd,
    "--environment",
    args.environment,
  ];
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
  return handoffArgs;
}

export function runHandoffValidation(
  args: CliArgs,
  paths: ProductionGatePaths
): CommandRunResult {
  const handoffResult = runNodeScript(
    HANDOFF_RUNNER_PATH,
    buildHandoffArgs(args, paths.handoffOutDir)
  );
  if (!handoffResult.succeeded) {
    throw new Error(formatCommandFailure(handoffResult));
  }
  if (!fs.existsSync(paths.handoffSummaryPath)) {
    throw new Error(
      `Handoff summary artifact was not generated: ${toWorkspacePath(paths.handoffSummaryPath)}`
    );
  }
  return handoffResult;
}

function buildReadinessArgs(args: CliArgs, paths: ProductionGatePaths): string[] {
  const readinessArgs = [
    "--summary",
    paths.handoffSummaryPath,
    "--out",
    paths.readinessReportPath,
    "--expected-environment",
    args.expectedEnvironment,
  ];
  if (args.allowRndDefaultSecretRefs) {
    readinessArgs.push("--allow-rnd-default-secret-ref");
  }
  if (args.requireProvidedInput) {
    readinessArgs.push("--require-provided-input");
  }
  return readinessArgs;
}

export function runReadinessValidation(
  args: CliArgs,
  paths: ProductionGatePaths
): {
  readinessResult: CommandRunResult;
  readinessReport: SchedulerProductionReadinessReport | null;
} {
  const readinessResult = runNodeScript(
    READINESS_RUNNER_PATH,
    buildReadinessArgs(args, paths)
  );
  const readinessReport = fs.existsSync(paths.readinessReportPath)
    ? parseReadinessReport(readJsonFile(paths.readinessReportPath), paths.readinessReportPath)
    : null;
  return { readinessResult, readinessReport };
}
