import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";
import type {
  ExpectedIdentity,
  SchedulerDeploymentBundle,
} from "./scheduler-handoff-validation-types";

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

function assertDeploymentBundleIdentity(
  raw: Record<string, unknown>,
  sourcePath: string,
  expected: ExpectedIdentity
): void {
  if (
    raw.module !== expected.moduleId ||
    raw.phase !== "EVALUATION" ||
    raw.kpiId !== expected.kpiId
  ) {
    throw new Error(`Unexpected deployment bundle identity in ${sourcePath}.`);
  }
  if (raw.artifact !== "scheduler_deployment_bundle") {
    throw new Error(`Unexpected deployment bundle artifact in ${sourcePath}.`);
  }
}

function parseDeploymentBundleSecrets(
  secrets: Record<string, unknown>
): SchedulerDeploymentBundle["secrets"] {
  const requiredEnvKeys = parseStringArray(
    secrets.requiredEnvKeys,
    "deploymentBundle.secrets.requiredEnvKeys"
  ).map((entry, index) =>
    assertEnvironmentVariableName(entry, `deploymentBundle.secrets.requiredEnvKeys[${index}]`)
  );

  return {
    requiredEnvKeys,
    failureWebhookEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        secrets.failureWebhookEnvKey,
        "deploymentBundle.secrets.failureWebhookEnvKey"
      ),
      "deploymentBundle.secrets.failureWebhookEnvKey"
    ),
    failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        secrets.failureWebhookTimeoutEnvKey,
        "deploymentBundle.secrets.failureWebhookTimeoutEnvKey"
      ),
      "deploymentBundle.secrets.failureWebhookTimeoutEnvKey"
    ),
  };
}

function parseDeploymentBundleVerification(
  verification: Record<string, unknown>
): SchedulerDeploymentBundle["verification"] {
  return {
    expectedOutputs: parseStringArray(
      verification.expectedOutputs,
      "deploymentBundle.verification.expectedOutputs"
    ),
  };
}

export function parseDeploymentBundle(
  raw: unknown,
  sourcePath: string,
  expected: ExpectedIdentity
): SchedulerDeploymentBundle {
  if (!isPlainObject(raw)) {
    throw new Error(`Deployment bundle must be a JSON object: ${sourcePath}`);
  }
  assertDeploymentBundleIdentity(raw, sourcePath, expected);
  const secrets = requireSectionObject(
    raw.secrets,
    `deploymentBundle.secrets must be an object in ${sourcePath}.`
  );
  const verification = requireSectionObject(
    raw.verification,
    `deploymentBundle.verification must be an object in ${sourcePath}.`
  );

  return {
    module: expected.moduleId as SchedulerDeploymentBundle["module"],
    phase: "EVALUATION",
    kpiId: expected.kpiId as SchedulerDeploymentBundle["kpiId"],
    artifact: "scheduler_deployment_bundle",
    generatedAt: assertNonEmptyString(raw.generatedAt, "deploymentBundle.generatedAt"),
    secrets: parseDeploymentBundleSecrets(secrets),
    verification: parseDeploymentBundleVerification(verification),
  };
}
