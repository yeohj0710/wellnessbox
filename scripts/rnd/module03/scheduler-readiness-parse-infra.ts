import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  MODULE03_KPI06_ID,
  MODULE03_MODULE_ID,
  type SchedulerInfraBindingArtifact,
} from "./scheduler-readiness-artifacts.types";
import {
  parseBindings,
  parseEnvironmentVariableArray,
} from "./scheduler-readiness-parse-common";

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
