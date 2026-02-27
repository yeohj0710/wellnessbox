import {
  MODULE03_KPI06_ID,
  MODULE03_MODULE_ID,
} from "./scheduler-readiness-artifacts";
import { toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type {
  CliArgs,
  ReadinessComputation,
  ReadinessSource,
  SchedulerProductionReadinessReport,
} from "./validate-scheduler-production-readiness-types";

export function buildReadinessReport(
  args: CliArgs,
  source: ReadinessSource,
  computation: ReadinessComputation
): SchedulerProductionReadinessReport {
  const report: SchedulerProductionReadinessReport = {
    module: MODULE03_MODULE_ID,
    phase: "EVALUATION",
    kpiId: MODULE03_KPI06_ID,
    artifact: "scheduler_production_readiness_report",
    generatedAt: new Date().toISOString(),
    result: computation.failedChecks.length === 0 ? "pass" : "fail",
    expectedEnvironment: args.expectedEnvironment,
    source: {
      summaryPath: toWorkspacePath(args.summaryPath),
      infraBindingPath: toWorkspacePath(source.resolvedInfraBindingPath),
    },
    input: {
      source: source.summary.input.source,
      path: source.summary.input.path,
      rowCount: source.summary.input.rowCount,
      requireProvidedInput: args.requireProvidedInput,
    },
    scheduler: {
      name: source.summary.scheduler.name,
      summaryEnvironment: source.summary.scheduler.environment,
      infraEnvironment: source.infra.environment,
      commandTemplate: source.infra.scheduler.commandTemplate,
    },
    checks: computation.checks,
    failures: computation.failedChecks.map((check) => check.id),
  };
  return report;
}

export function handleReadinessExit(
  args: CliArgs,
  computation: ReadinessComputation
): void {
  const reportWorkspacePath = toWorkspacePath(args.outPath);
  if (computation.failedChecks.length > 0) {
    console.error(
      `Wrote Module 03 KPI #6 scheduler production-readiness report (FAIL): ${reportWorkspacePath}`
    );
    console.error(
      `Failed check(s): ${computation.failedChecks.map((check) => check.id).join(", ")}`
    );
    process.exit(1);
  }

  console.log(
    `Wrote Module 03 KPI #6 scheduler production-readiness report (PASS): ${reportWorkspacePath}`
  );
}
