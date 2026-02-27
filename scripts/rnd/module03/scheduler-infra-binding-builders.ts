import { toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertEnvironmentVariableName } from "./cli-helpers";
import { isPlaceholderSecretRef } from "./scheduler-secret-bindings";
import type {
  InfraBindingBuildOptions,
  SchedulerDeploymentBundle,
  SchedulerInfraBindingArtifact,
} from "./scheduler-infra-binding-types";

function resolveRequiredEnvKeys(bundle: SchedulerDeploymentBundle): string[] {
  return [
    ...new Set(
      bundle.secrets.requiredEnvKeys.map((value) =>
        assertEnvironmentVariableName(value, "bundle.secrets.requiredEnvKeys")
      )
    ),
  ].sort();
}

function assertNoMissingBindings(
  requiredEnvKeys: string[],
  bindingsMap: Map<string, string>
): void {
  const missingEnvKeys = requiredEnvKeys.filter((envKey) => !bindingsMap.has(envKey));
  if (missingEnvKeys.length > 0) {
    throw new Error(
      `Missing required secret bindings for env key(s): ${missingEnvKeys.join(", ")}.`
    );
  }
}

function buildRequiredBindings(
  requiredEnvKeys: string[],
  bindingsMap: Map<string, string>
): Array<{ envKey: string; secretRef: string }> {
  return requiredEnvKeys.map((envKey) => ({
    envKey,
    secretRef: bindingsMap.get(envKey) as string,
  }));
}

function assertNoPlaceholderBindings(
  allowPlaceholderSecretRefs: boolean,
  bindings: Array<{ envKey: string; secretRef: string }>
): void {
  const placeholderBindings = bindings.filter((entry) =>
    isPlaceholderSecretRef(entry.secretRef)
  );
  if (!allowPlaceholderSecretRefs && placeholderBindings.length > 0) {
    throw new Error(
      `Placeholder secret reference(s) are not allowed: ${placeholderBindings
        .map((entry) => `${entry.envKey}=${entry.secretRef}`)
        .join(", ")}`
    );
  }
}

function buildInfraSecretsSection(
  bundle: SchedulerDeploymentBundle,
  requiredEnvKeys: string[],
  bindings: Array<{ envKey: string; secretRef: string }>
): SchedulerInfraBindingArtifact["secrets"] {
  return {
    requiredEnvKeys,
    boundEnvKeys: requiredEnvKeys,
    missingEnvKeys: [],
    failureWebhookEnvKey: bundle.secrets.failureWebhookEnvKey,
    failureWebhookTimeoutEnvKey: bundle.secrets.failureWebhookTimeoutEnvKey,
    bindings,
  };
}

export function buildInfraBindingArtifact(
  options: InfraBindingBuildOptions,
  bundle: SchedulerDeploymentBundle,
  bindingsMap: Map<string, string>
): SchedulerInfraBindingArtifact {
  const requiredEnvKeys = resolveRequiredEnvKeys(bundle);
  assertNoMissingBindings(requiredEnvKeys, bindingsMap);
  const bindings = buildRequiredBindings(requiredEnvKeys, bindingsMap);
  assertNoPlaceholderBindings(options.allowPlaceholderSecretRefs, bindings);

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    artifact: "scheduler_infra_binding",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    environment: options.environment,
    sourceBundlePath: toWorkspacePath(options.bundlePath),
    scheduler: {
      name: options.schedulerName,
      cadenceCron: bundle.scheduler.cadenceCron,
      timezone: bundle.scheduler.timezone,
      npmScript: bundle.scheduler.npmScript,
      commandTemplate: bundle.scheduler.commandTemplate,
      commandArgs: bundle.scheduler.commandArgs,
    },
    secrets: buildInfraSecretsSection(bundle, requiredEnvKeys, bindings),
    warehouse: bundle.warehouse,
    artifacts: bundle.artifacts,
    verification: bundle.verification,
  };
}
