import path from "node:path";
import { assertEnvironmentVariableName } from "./cli-helpers";
import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  KPI_ID,
  MODULE_ID,
  type Module03SchedulerInfraBindingArtifact,
} from "./scheduler-dry-run-types";

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function assertInfraBindingIdentity(raw: Record<string, unknown>): void {
  if (raw.module !== MODULE_ID) {
    throw new Error(`infraBinding.module must be "${MODULE_ID}".`);
  }
  if (raw.phase !== "EVALUATION") {
    throw new Error('infraBinding.phase must be "EVALUATION".');
  }
  if (raw.kpiId !== KPI_ID) {
    throw new Error(`infraBinding.kpiId must be "${KPI_ID}".`);
  }
  if (raw.artifact !== "scheduler_infra_binding") {
    throw new Error('infraBinding.artifact must be "scheduler_infra_binding".');
  }
}

function requireInfraSectionObject(
  value: unknown,
  errorMessage: string
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

function parseInfraSchedulerSection(
  scheduler: Record<string, unknown>
): Module03SchedulerInfraBindingArtifact["scheduler"] {
  return {
    commandArgs: parseStringArray(
      scheduler.commandArgs,
      "infraBinding.scheduler.commandArgs"
    ),
  };
}

function parseInfraSecretsSection(
  secrets: Record<string, unknown>
): Module03SchedulerInfraBindingArtifact["secrets"] {
  const requiredEnvKeys = parseStringArray(
    secrets.requiredEnvKeys,
    "infraBinding.secrets.requiredEnvKeys"
  ).map((entry, index) =>
    assertEnvironmentVariableName(entry, `infraBinding.secrets.requiredEnvKeys[${index}]`)
  );

  return {
    requiredEnvKeys,
    failureWebhookEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        secrets.failureWebhookEnvKey,
        "infraBinding.secrets.failureWebhookEnvKey"
      ),
      "infraBinding.secrets.failureWebhookEnvKey"
    ),
    failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        secrets.failureWebhookTimeoutEnvKey,
        "infraBinding.secrets.failureWebhookTimeoutEnvKey"
      ),
      "infraBinding.secrets.failureWebhookTimeoutEnvKey"
    ),
  };
}

function parseInfraWarehouseSection(
  warehouse: Record<string, unknown>
): Module03SchedulerInfraBindingArtifact["warehouse"] {
  return {
    schemaMapPath: assertNonEmptyString(
      warehouse.schemaMapPath,
      "infraBinding.warehouse.schemaMapPath"
    ),
  };
}

function parseInfraArtifactsSection(
  artifacts: Record<string, unknown>
): Module03SchedulerInfraBindingArtifact["artifacts"] {
  return {
    archiveDir: assertNonEmptyString(
      artifacts.archiveDir,
      "infraBinding.artifacts.archiveDir"
    ),
    handoffDir: assertNonEmptyString(
      artifacts.handoffDir,
      "infraBinding.artifacts.handoffDir"
    ),
    failureAlertDir: assertNonEmptyString(
      artifacts.failureAlertDir,
      "infraBinding.artifacts.failureAlertDir"
    ),
  };
}

function parseInfraVerificationSection(
  verification: Record<string, unknown>
): Module03SchedulerInfraBindingArtifact["verification"] {
  return {
    expectedOutputs: parseStringArray(
      verification.expectedOutputs,
      "infraBinding.verification.expectedOutputs"
    ),
  };
}

export function resolveArtifactPath(value: string): string {
  const normalized = value.replace(/\//g, path.sep);
  if (path.isAbsolute(normalized)) {
    return normalized;
  }
  return path.resolve(process.cwd(), normalized);
}

export function parseInfraBindingArtifact(
  raw: unknown,
  sourcePath: string
): Module03SchedulerInfraBindingArtifact {
  if (!isPlainObject(raw)) {
    throw new Error(`Infra binding file must be a JSON object: ${sourcePath}`);
  }
  assertInfraBindingIdentity(raw);

  const scheduler = requireInfraSectionObject(
    raw.scheduler,
    "infraBinding.scheduler must be an object."
  );
  const secrets = requireInfraSectionObject(
    raw.secrets,
    "infraBinding.secrets must be an object."
  );
  const warehouse = requireInfraSectionObject(
    raw.warehouse,
    "infraBinding.warehouse must be an object."
  );
  const artifacts = requireInfraSectionObject(
    raw.artifacts,
    "infraBinding.artifacts must be an object."
  );
  const verification = requireInfraSectionObject(
    raw.verification,
    "infraBinding.verification must be an object."
  );

  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "scheduler_infra_binding",
    scheduler: parseInfraSchedulerSection(scheduler),
    secrets: parseInfraSecretsSection(secrets),
    warehouse: parseInfraWarehouseSection(warehouse),
    artifacts: parseInfraArtifactsSection(artifacts),
    verification: parseInfraVerificationSection(verification),
  };
}
