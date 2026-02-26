import path from "node:path";
import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";

export const MODULE03_MODULE_ID = "03_personal_safety_validation_engine";
export const MODULE03_KPI06_ID = "kpi-06";

export type SchedulerInputSource =
  | "provided_input"
  | "generated_representative_window";

export type EnvSecretBinding = {
  envKey: string;
  secretRef: string;
};

export type SchedulerHandoffValidationSummary = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_handoff_validation";
  strictEnv: boolean;
  input: {
    source: SchedulerInputSource;
    path: string;
    rowCount: number;
  };
  scheduler: {
    name: string;
    environment: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    boundSecretRefs: EnvSecretBinding[];
  };
  artifacts: {
    infraBindingPath: string;
  };
  verification: {
    allExpectedOutputsPresent: boolean;
    missingRequiredEnvKeys: string[];
  };
};

export type SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  environment: string;
  scheduler: {
    name: string;
    commandTemplate: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    missingEnvKeys: string[];
    bindings: EnvSecretBinding[];
  };
};

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

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function parseEnvironmentVariableArray(value: unknown, fieldName: string): string[] {
  return parseStringArray(value, fieldName).map((entry, index) =>
    assertEnvironmentVariableName(
      assertNonEmptyString(entry, `${fieldName}[${index}]`),
      `${fieldName}[${index}]`
    )
  );
}

function parseBindings(value: unknown, fieldName: string): EnvSecretBinding[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !isPlainObject(entry) ||
        typeof entry.envKey !== "string" ||
        typeof entry.secretRef !== "string"
    )
  ) {
    throw new Error(`${fieldName} must be an array of { envKey, secretRef }.`);
  }

  const seenEnvKeys = new Set<string>();
  return value.map((entry, index) => {
    const envKey = assertEnvironmentVariableName(
      assertNonEmptyString(entry.envKey, `${fieldName}[${index}].envKey`),
      `${fieldName}[${index}].envKey`
    );
    if (seenEnvKeys.has(envKey)) {
      throw new Error(`${fieldName} contains duplicate envKey "${envKey}".`);
    }
    seenEnvKeys.add(envKey);

    const secretRef = assertNonEmptyString(
      entry.secretRef,
      `${fieldName}[${index}].secretRef`
    );
    if (/\s/.test(secretRef)) {
      throw new Error(`${fieldName}[${index}].secretRef must not contain whitespace.`);
    }
    return { envKey, secretRef };
  });
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

export function parseInfraBinding(
  raw: unknown,
  sourcePath: string
): SchedulerInfraBindingArtifact {
  if (!isPlainObject(raw)) {
    throw new Error(`Infra-binding must be a JSON object: ${sourcePath}`);
  }
  if (
    raw.module !== MODULE03_MODULE_ID ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== MODULE03_KPI06_ID ||
    raw.artifact !== "scheduler_infra_binding"
  ) {
    throw new Error(`Unexpected infra-binding identity: ${sourcePath}`);
  }
  if (!isPlainObject(raw.scheduler)) {
    throw new Error(`infraBinding.scheduler must be an object: ${sourcePath}`);
  }
  if (!isPlainObject(raw.secrets)) {
    throw new Error(`infraBinding.secrets must be an object: ${sourcePath}`);
  }

  return {
    module: MODULE03_MODULE_ID,
    phase: "EVALUATION",
    kpiId: MODULE03_KPI06_ID,
    artifact: "scheduler_infra_binding",
    environment: assertNonEmptyString(raw.environment, "infraBinding.environment"),
    scheduler: {
      name: assertNonEmptyString(raw.scheduler.name, "infraBinding.scheduler.name"),
      commandTemplate: assertNonEmptyString(
        raw.scheduler.commandTemplate,
        "infraBinding.scheduler.commandTemplate"
      ),
    },
    secrets: {
      requiredEnvKeys: parseEnvironmentVariableArray(
        raw.secrets.requiredEnvKeys,
        "infraBinding.secrets.requiredEnvKeys"
      ),
      missingEnvKeys: parseEnvironmentVariableArray(
        raw.secrets.missingEnvKeys,
        "infraBinding.secrets.missingEnvKeys"
      ),
      bindings: parseBindings(raw.secrets.bindings, "infraBinding.secrets.bindings"),
    },
  };
}

export function resolveArtifactPath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  return path.resolve(process.cwd(), rawPath);
}
