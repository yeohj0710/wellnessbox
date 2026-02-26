// RND: Module 03 KPI #6 scheduler production-readiness validator.

import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  readJsonFile,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { hasFlag } from "./cli-helpers";
import {
  MODULE03_KPI06_ID,
  MODULE03_MODULE_ID,
  parseHandoffSummary,
  parseInfraBinding,
  resolveArtifactPath,
} from "./scheduler-readiness-artifacts";
import {
  buildReadinessChecks,
  type ReadinessCheck,
} from "./scheduler-readiness-checks";

type CliArgs = {
  summaryPath: string;
  outPath: string;
  expectedEnvironment: string;
  requireProvidedInput: boolean;
  allowRndDefaultSecretRefs: boolean;
};

type SchedulerProductionReadinessReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_readiness_report";
  generatedAt: string;
  result: "pass" | "fail";
  expectedEnvironment: string;
  source: {
    summaryPath: string;
    infraBindingPath: string;
  };
  input: {
    source: "provided_input" | "generated_representative_window";
    path: string;
    rowCount: number;
    requireProvidedInput: boolean;
  };
  scheduler: {
    name: string;
    summaryEnvironment: string;
    infraEnvironment: string;
    commandTemplate: string;
  };
  checks: ReadinessCheck[];
  failures: string[];
};

const DEFAULT_EXPECTED_ENVIRONMENT = "production";
const DEFAULT_OUT_FILENAME = "scheduler-production-readiness-report.json";
const DEFAULT_RND_SECRET_REF_PREFIX = "secret://rnd/module03/kpi06/";

function parseArgs(argv: string[]): CliArgs {
  const summaryPathValue = getArgValue(argv, "--summary");
  if (!summaryPathValue) {
    throw new Error("--summary is required.");
  }
  const summaryPath = path.resolve(summaryPathValue);
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`--summary file does not exist: ${summaryPath}`);
  }

  const outPath = path.resolve(
    getArgValue(argv, "--out") ?? path.join(path.dirname(summaryPath), DEFAULT_OUT_FILENAME)
  );
  const expectedEnvironment = assertNonEmptyString(
    getArgValue(argv, "--expected-environment") ?? DEFAULT_EXPECTED_ENVIRONMENT,
    "--expected-environment"
  );

  return {
    summaryPath,
    outPath,
    expectedEnvironment,
    requireProvidedInput: hasFlag(argv, "--require-provided-input"),
    allowRndDefaultSecretRefs: hasFlag(argv, "--allow-rnd-default-secret-ref"),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const summaryRaw = readJsonFile(args.summaryPath);
  const summary = parseHandoffSummary(summaryRaw, args.summaryPath);

  const resolvedInfraBindingPath = resolveArtifactPath(summary.artifacts.infraBindingPath);
  if (!fs.existsSync(resolvedInfraBindingPath)) {
    throw new Error(`Referenced infra binding file does not exist: ${resolvedInfraBindingPath}`);
  }
  const infraRaw = readJsonFile(resolvedInfraBindingPath);
  const infra = parseInfraBinding(infraRaw, resolvedInfraBindingPath);

  const checks = buildReadinessChecks(
    {
      expectedEnvironment: args.expectedEnvironment,
      requireProvidedInput: args.requireProvidedInput,
      allowRndDefaultSecretRefs: args.allowRndDefaultSecretRefs,
      rndDefaultSecretRefPrefix: DEFAULT_RND_SECRET_REF_PREFIX,
    },
    summary,
    infra
  );
  const failedChecks = checks.filter((check) => !check.passed);

  const report: SchedulerProductionReadinessReport = {
    module: MODULE03_MODULE_ID,
    phase: "EVALUATION",
    kpiId: MODULE03_KPI06_ID,
    artifact: "scheduler_production_readiness_report",
    generatedAt: new Date().toISOString(),
    result: failedChecks.length === 0 ? "pass" : "fail",
    expectedEnvironment: args.expectedEnvironment,
    source: {
      summaryPath: toWorkspacePath(args.summaryPath),
      infraBindingPath: toWorkspacePath(resolvedInfraBindingPath),
    },
    input: {
      source: summary.input.source,
      path: summary.input.path,
      rowCount: summary.input.rowCount,
      requireProvidedInput: args.requireProvidedInput,
    },
    scheduler: {
      name: summary.scheduler.name,
      summaryEnvironment: summary.scheduler.environment,
      infraEnvironment: infra.environment,
      commandTemplate: infra.scheduler.commandTemplate,
    },
    checks,
    failures: failedChecks.map((check) => check.id),
  };

  writeJsonFile(args.outPath, report);

  const reportWorkspacePath = toWorkspacePath(args.outPath);
  if (failedChecks.length > 0) {
    console.error(
      `Wrote Module 03 KPI #6 scheduler production-readiness report (FAIL): ${reportWorkspacePath}`
    );
    console.error(`Failed check(s): ${failedChecks.map((check) => check.id).join(", ")}`);
    process.exit(1);
  }

  console.log(
    `Wrote Module 03 KPI #6 scheduler production-readiness report (PASS): ${reportWorkspacePath}`
  );
}

main();
