import { parseKeyValuePair } from "./cli-helpers";
import type { SchedulerDeploymentBundle } from "./scheduler-handoff-validation-artifacts";

function buildDefaultSecretRef(envKey: string): string {
  return `secret://rnd/module03/kpi06/${envKey.toLowerCase()}`;
}

export function buildSecretBindingMap(
  requiredEnvKeys: string[],
  explicitPairs: string[]
): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const envKey of requiredEnvKeys) {
    bindings.set(envKey, buildDefaultSecretRef(envKey));
  }

  for (const rawPair of explicitPairs) {
    const parsedPair = parseKeyValuePair(rawPair, "--secret-binding");
    bindings.set(parsedPair.key, parsedPair.value);
  }

  return bindings;
}

export function buildRuntimeEnvValues(
  bundle: SchedulerDeploymentBundle,
  explicitPairs: string[]
): Map<string, string> {
  const runtimeValues = new Map<string, string>();

  for (const envKey of bundle.secrets.requiredEnvKeys) {
    if (envKey === bundle.secrets.failureWebhookEnvKey) {
      runtimeValues.set(envKey, "https://example.com/rnd/module03/kpi06/failure-webhook");
      continue;
    }
    if (envKey === bundle.secrets.failureWebhookTimeoutEnvKey) {
      runtimeValues.set(envKey, "3000");
      continue;
    }
    runtimeValues.set(envKey, `simulated-${envKey.toLowerCase()}`);
  }

  for (const rawPair of explicitPairs) {
    const parsedPair = parseKeyValuePair(rawPair, "--env-value");
    runtimeValues.set(parsedPair.key, parsedPair.value);
  }

  return runtimeValues;
}

export function toRuntimeEnvOverrides(
  runtimeEnvValueMap: Map<string, string>
): Record<string, string> {
  const runtimeEnvOverrides: Record<string, string> = {};
  for (const [envKey, envValue] of runtimeEnvValueMap.entries()) {
    runtimeEnvOverrides[envKey] = envValue;
  }
  return runtimeEnvOverrides;
}
