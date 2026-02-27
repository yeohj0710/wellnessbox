import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { RetentionPolicyResult } from "./monthly-archive-artifacts";
import {
  OPS_RUNNER_PATH,
  type CliArgs,
} from "./archive-adverse-event-evaluation-monthly-types";

function assertOpsRunnerExists(): void {
  if (!fs.existsSync(OPS_RUNNER_PATH)) {
    throw new Error(`Ops evaluation runner does not exist: ${OPS_RUNNER_PATH}`);
  }
}

function buildOpsRunnerArgs(args: CliArgs, outputPath: string): string[] {
  const runnerArgs = [
    OPS_RUNNER_PATH,
    "--input",
    args.inputPath,
    "--out",
    outputPath,
    "--evaluated-at",
    args.windowEnd,
  ];
  if (args.schemaMapPath) {
    runnerArgs.push("--schema-map", args.schemaMapPath);
  }
  return runnerArgs;
}

function formatOpsEvaluationError(
  args: CliArgs,
  outputPath: string,
  error: unknown
): string {
  const processError = error as NodeJS.ErrnoException & {
    stdout?: string;
    stderr?: string;
  };
  const stdout = typeof processError.stdout === "string" ? processError.stdout.trim() : "";
  const stderr = typeof processError.stderr === "string" ? processError.stderr.trim() : "";

  return [
    "Failed to run Module 03 KPI #6 ops evaluation.",
    `Command: node ${path.relative(process.cwd(), OPS_RUNNER_PATH)} --input ${args.inputPath} --out ${outputPath} --evaluated-at ${args.windowEnd}`,
    stdout.length > 0 ? `stdout: ${stdout}` : "",
    stderr.length > 0 ? `stderr: ${stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function runOpsEvaluation(args: CliArgs, outputPath: string): void {
  assertOpsRunnerExists();
  const runnerArgs = buildOpsRunnerArgs(args, outputPath);
  try {
    execFileSync(process.execPath, runnerArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: unknown) {
    throw new Error(formatOpsEvaluationError(args, outputPath, error));
  }
}

export function logArchiveResults(
  retentionMonths: number | null,
  reportPath: string,
  manifestPath: string,
  retentionResult: RetentionPolicyResult
): void {
  console.log(`Wrote Module 03 KPI #6 monthly archive report: ${reportPath}`);
  console.log(`Updated Module 03 KPI #6 archive manifest: ${manifestPath}`);
  if (retentionMonths !== null) {
    console.log(
      `Applied retention policy: ${retentionMonths} month(s), pruned entries=${retentionResult.prunedEntries.length}, pruned reports=${retentionResult.prunedReportCount}`
    );
  }
}
