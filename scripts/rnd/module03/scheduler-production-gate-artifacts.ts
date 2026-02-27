import { isPlainObject, toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { NodeScriptRunResult as CommandRunResult } from "./node-script-runner";
import {
  KPI_ID,
  MODULE_ID,
  type CliArgs,
  type Module03SchedulerProductionGateArtifact,
  type ProductionGatePaths,
  type SchedulerProductionReadinessReport,
} from "./scheduler-production-gate-types";

export function parseReadinessReport(
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

export function buildProductionGateArtifact(
  args: CliArgs,
  paths: ProductionGatePaths,
  handoffResult: CommandRunResult,
  readinessResult: CommandRunResult,
  readinessReport: SchedulerProductionReadinessReport | null
): Module03SchedulerProductionGateArtifact {
  return {
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
      handoffSummaryPath: toWorkspacePath(paths.handoffSummaryPath),
      readinessReportPath: toWorkspacePath(paths.readinessReportPath),
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
}
