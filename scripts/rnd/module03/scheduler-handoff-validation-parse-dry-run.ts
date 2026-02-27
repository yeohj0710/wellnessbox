import { isPlainObject } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type {
  ExpectedIdentity,
  SchedulerDryRunReport,
} from "./scheduler-handoff-validation-types";

type DryRunExpectedOutput = SchedulerDryRunReport["verification"]["expectedOutputs"][number];

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function requireSectionObject(
  value: unknown,
  errorMessage: string
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

function assertDryRunReportIdentity(
  raw: Record<string, unknown>,
  sourcePath: string,
  expected: ExpectedIdentity
): void {
  if (
    raw.module !== expected.moduleId ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== expected.kpiId
  ) {
    throw new Error(`Unexpected dry-run report identity in ${sourcePath}.`);
  }
  if (raw.artifact !== "scheduler_dry_run_report") {
    throw new Error(`Unexpected dry-run report artifact in ${sourcePath}.`);
  }
}

function parseDryRunExpectedOutputs(
  verification: Record<string, unknown>,
  sourcePath: string
): DryRunExpectedOutput[] {
  const expectedOutputs = verification.expectedOutputs;
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

  return expectedOutputs.map((entry) => ({
    path: entry.path,
    exists: entry.exists,
  }));
}

function parseDryRunVerificationSection(
  verification: Record<string, unknown>,
  sourcePath: string
): SchedulerDryRunReport["verification"] {
  if (typeof verification.allExpectedOutputsPresent !== "boolean") {
    throw new Error(
      `dryRunReport.verification.allExpectedOutputsPresent must be boolean in ${sourcePath}.`
    );
  }

  return {
    allExpectedOutputsPresent: verification.allExpectedOutputsPresent,
    expectedOutputs: parseDryRunExpectedOutputs(verification, sourcePath),
  };
}

function parseDryRunSection(
  dryRun: Record<string, unknown>
): SchedulerDryRunReport["dryRun"] {
  return {
    missingRequiredEnvKeys: parseStringArray(
      dryRun.missingRequiredEnvKeys,
      "dryRunReport.dryRun.missingRequiredEnvKeys"
    ),
  };
}

export function parseDryRunReport(
  raw: unknown,
  sourcePath: string,
  expected: ExpectedIdentity
): SchedulerDryRunReport {
  if (!isPlainObject(raw)) {
    throw new Error(`Dry-run report must be a JSON object: ${sourcePath}`);
  }
  assertDryRunReportIdentity(raw, sourcePath, expected);
  const verification = requireSectionObject(
    raw.verification,
    `dryRunReport.verification must be an object in ${sourcePath}.`
  );
  const dryRun = requireSectionObject(
    raw.dryRun,
    `dryRunReport.dryRun must be an object in ${sourcePath}.`
  );

  return {
    module: expected.moduleId as SchedulerDryRunReport["module"],
    phase: "EVALUATION",
    kpiId: expected.kpiId as SchedulerDryRunReport["kpiId"],
    artifact: "scheduler_dry_run_report",
    verification: parseDryRunVerificationSection(verification, sourcePath),
    dryRun: parseDryRunSection(dryRun),
  };
}
