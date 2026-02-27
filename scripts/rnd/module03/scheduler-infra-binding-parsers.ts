import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";
import type { SchedulerDeploymentBundle } from "./scheduler-infra-binding-types";

function assertBundleIdentity(raw: Record<string, unknown>): void {
  const moduleId = raw.module;
  const phase = raw.phase;
  const kpiId = raw.kpiId;
  const artifact = raw.artifact;
  if (moduleId !== "03_personal_safety_validation_engine") {
    throw new Error(
      `Bundle module must be "03_personal_safety_validation_engine", received "${String(moduleId)}".`
    );
  }
  if (phase !== "EVALUATION") {
    throw new Error(`Bundle phase must be "EVALUATION", received "${String(phase)}".`);
  }
  if (kpiId !== "kpi-06") {
    throw new Error(`Bundle kpiId must be "kpi-06", received "${String(kpiId)}".`);
  }
  if (artifact !== "scheduler_deployment_bundle") {
    throw new Error(
      `Bundle artifact must be "scheduler_deployment_bundle", received "${String(artifact)}".`
    );
  }
}

function requireBundleObject(
  value: unknown,
  errorMessage: string
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

function parseStringArrayOrThrow(value: unknown, errorMessage: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(errorMessage);
  }
  return value;
}

function parseBindingsTemplateOrThrow(
  value: unknown
): Array<{ envKey: string; secretRef: string }> {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !isPlainObject(entry) ||
        typeof entry.envKey !== "string" ||
        typeof entry.secretRef !== "string"
    )
  ) {
    throw new Error("Bundle secrets.bindingsTemplate must be an array of { envKey, secretRef }.");
  }
  return value.map((entry) => ({
    envKey: entry.envKey,
    secretRef: entry.secretRef,
  }));
}

function parseSchedulerSection(
  scheduler: Record<string, unknown>
): SchedulerDeploymentBundle["scheduler"] {
  const commandArgs = parseStringArrayOrThrow(
    scheduler.commandArgs,
    "Bundle scheduler.commandArgs must be a string array."
  );
  return {
    cadenceCron: assertNonEmptyString(
      typeof scheduler.cadenceCron === "string" ? scheduler.cadenceCron : null,
      "bundle.scheduler.cadenceCron"
    ),
    timezone: assertNonEmptyString(
      typeof scheduler.timezone === "string" ? scheduler.timezone : null,
      "bundle.scheduler.timezone"
    ),
    npmScript: "rnd:module03:evaluation:adverse:ops:scheduler",
    commandTemplate: assertNonEmptyString(
      typeof scheduler.commandTemplate === "string" ? scheduler.commandTemplate : null,
      "bundle.scheduler.commandTemplate"
    ),
    commandArgs,
  };
}

function parseWarehouseSection(
  warehouse: Record<string, unknown>
): SchedulerDeploymentBundle["warehouse"] {
  const placeholders = parseStringArrayOrThrow(
    warehouse.placeholders,
    "Bundle warehouse.placeholders must be a string array."
  );
  return {
    exportCommandTemplate: assertNonEmptyString(
      typeof warehouse.exportCommandTemplate === "string"
        ? warehouse.exportCommandTemplate
        : null,
      "bundle.warehouse.exportCommandTemplate"
    ),
    sqlTemplatePath: assertNonEmptyString(
      typeof warehouse.sqlTemplatePath === "string" ? warehouse.sqlTemplatePath : null,
      "bundle.warehouse.sqlTemplatePath"
    ),
    schemaMapPath: assertNonEmptyString(
      typeof warehouse.schemaMapPath === "string" ? warehouse.schemaMapPath : null,
      "bundle.warehouse.schemaMapPath"
    ),
    placeholders,
  };
}

function parseSecretsSection(
  secrets: Record<string, unknown>
): SchedulerDeploymentBundle["secrets"] {
  const requiredEnvKeys = parseStringArrayOrThrow(
    secrets.requiredEnvKeys,
    "Bundle secrets.requiredEnvKeys must be a string array."
  );
  const bindingsTemplate = parseBindingsTemplateOrThrow(secrets.bindingsTemplate);
  return {
    requiredEnvKeys,
    failureWebhookEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        typeof secrets.failureWebhookEnvKey === "string"
          ? secrets.failureWebhookEnvKey
          : null,
        "bundle.secrets.failureWebhookEnvKey"
      ),
      "bundle.secrets.failureWebhookEnvKey"
    ),
    failureWebhookTimeoutEnvKey: assertEnvironmentVariableName(
      assertNonEmptyString(
        typeof secrets.failureWebhookTimeoutEnvKey === "string"
          ? secrets.failureWebhookTimeoutEnvKey
          : null,
        "bundle.secrets.failureWebhookTimeoutEnvKey"
      ),
      "bundle.secrets.failureWebhookTimeoutEnvKey"
    ),
    bindingsTemplate,
  };
}

function parseArtifactsSection(
  artifacts: Record<string, unknown>
): SchedulerDeploymentBundle["artifacts"] {
  return {
    archiveDir: assertNonEmptyString(
      typeof artifacts.archiveDir === "string" ? artifacts.archiveDir : null,
      "bundle.artifacts.archiveDir"
    ),
    handoffDir: assertNonEmptyString(
      typeof artifacts.handoffDir === "string" ? artifacts.handoffDir : null,
      "bundle.artifacts.handoffDir"
    ),
    failureAlertDir: assertNonEmptyString(
      typeof artifacts.failureAlertDir === "string" ? artifacts.failureAlertDir : null,
      "bundle.artifacts.failureAlertDir"
    ),
  };
}

function parseVerificationSection(
  verification: Record<string, unknown>
): SchedulerDeploymentBundle["verification"] {
  const expectedOutputs = parseStringArrayOrThrow(
    verification.expectedOutputs,
    "Bundle verification.expectedOutputs must be a string array."
  );
  return {
    dryRunCommandWithInput: assertNonEmptyString(
      typeof verification.dryRunCommandWithInput === "string"
        ? verification.dryRunCommandWithInput
        : null,
      "bundle.verification.dryRunCommandWithInput"
    ),
    expectedOutputs,
  };
}

export function parseSchedulerDeploymentBundle(
  raw: unknown,
  sourcePath: string
): SchedulerDeploymentBundle {
  if (!isPlainObject(raw)) {
    throw new Error(`Bundle file must be a JSON object: ${sourcePath}`);
  }
  assertBundleIdentity(raw);

  const scheduler = requireBundleObject(raw.scheduler, "Bundle scheduler must be an object.");
  const warehouse = requireBundleObject(raw.warehouse, "Bundle warehouse must be an object.");
  const secrets = requireBundleObject(raw.secrets, "Bundle secrets must be an object.");
  const artifacts = requireBundleObject(raw.artifacts, "Bundle artifacts must be an object.");
  const verification = requireBundleObject(raw.verification, "Bundle verification must be an object.");

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    artifact: "scheduler_deployment_bundle",
    generatedAt: assertNonEmptyString(
      typeof raw.generatedAt === "string" ? raw.generatedAt : null,
      "bundle.generatedAt"
    ),
    scheduler: parseSchedulerSection(scheduler),
    warehouse: parseWarehouseSection(warehouse),
    secrets: parseSecretsSection(secrets),
    artifacts: parseArtifactsSection(artifacts),
    verification: parseVerificationSection(verification),
  };
}
