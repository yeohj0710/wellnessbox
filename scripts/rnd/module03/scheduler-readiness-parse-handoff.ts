import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  MODULE03_KPI06_ID,
  MODULE03_MODULE_ID,
  type SchedulerHandoffValidationSummary,
  type SchedulerInputSource,
} from "./scheduler-readiness-artifacts.types";
import {
  parseBindings,
  parseEnvironmentVariableArray,
} from "./scheduler-readiness-parse-common";

function assertPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return value;
}

function parseInputSource(value: unknown, fieldName: string): SchedulerInputSource {
  if (value === "provided_input" || value === "generated_representative_window") {
    return value;
  }
  throw new Error(
    `${fieldName} must be "provided_input" or "generated_representative_window".`
  );
}

export function parseHandoffSummary(
  raw: unknown,
  sourcePath: string
): SchedulerHandoffValidationSummary {
  if (!isPlainObject(raw)) {
    throw new Error(`Handoff summary must be a JSON object: ${sourcePath}`);
  }
  if (
    raw.module !== MODULE03_MODULE_ID ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== MODULE03_KPI06_ID ||
    raw.artifact !== "scheduler_handoff_validation"
  ) {
    throw new Error(`Unexpected handoff summary identity: ${sourcePath}`);
  }
  if (!isPlainObject(raw.scheduler)) {
    throw new Error(`handoffSummary.scheduler must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error(`handoffSummary.secrets must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.artifacts)) {
    throw new Error(`handoffSummary.artifacts must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.input)) {
    throw new Error(`handoffSummary.input must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.verification)) {
    throw new Error(`handoffSummary.verification must be an object: ${sourcePath}`);
  }
  if (typeof raw.strictEnv !== "boolean") {
    throw new Error(`handoffSummary.strictEnv must be boolean: ${sourcePath}`);
  }
  if (typeof raw.verification.allExpectedOutputsPresent !== "boolean") {
    throw new Error(
      `handoffSummary.verification.allExpectedOutputsPresent must be boolean: ${sourcePath}`
    );
  }

  return {
    module: MODULE03_MODULE_ID,
    phase: "EVALUATION",
    kpiId: MODULE03_KPI06_ID,
    artifact: "scheduler_handoff_validation",
    strictEnv: raw.strictEnv,
    input: {
      source: parseInputSource(
        raw.input.source,
        `handoffSummary.input.source (${sourcePath})`
      ),
      path: assertNonEmptyString(raw.input.path, "handoffSummary.input.path"),
      rowCount: assertPositiveInteger(raw.input.rowCount, "handoffSummary.input.rowCount"),
    },
    scheduler: {
      name: assertNonEmptyString(raw.scheduler.name, "handoffSummary.scheduler.name"),
      environment: assertNonEmptyString(
        raw.scheduler.environment,
        "handoffSummary.scheduler.environment"
      ),
    },
    secrets: {
      requiredEnvKeys: parseEnvironmentVariableArray(
        raw.secrets.requiredEnvKeys,
        "handoffSummary.secrets.requiredEnvKeys"
      ),
      boundSecretRefs: parseBindings(
        raw.secrets.boundSecretRefs,
        "handoffSummary.secrets.boundSecretRefs"
      ),
    },
    artifacts: {
      infraBindingPath: assertNonEmptyString(
        raw.artifacts.infraBindingPath,
        "handoffSummary.artifacts.infraBindingPath"
      ),
    },
    verification: {
      allExpectedOutputsPresent: raw.verification.allExpectedOutputsPresent,
      missingRequiredEnvKeys: parseEnvironmentVariableArray(
        raw.verification.missingRequiredEnvKeys,
        "handoffSummary.verification.missingRequiredEnvKeys"
      ),
    },
  };
}
