import type { EnvSecretBinding } from "./scheduler-readiness-artifacts";
import type {
  BuildReadinessChecksOptions,
  ReadinessCheck,
  ReadinessCheckContext,
} from "./scheduler-readiness-checks.types";
import type {
  SchedulerHandoffValidationSummary,
  SchedulerInfraBindingArtifact,
} from "./scheduler-readiness-artifacts";

function toStringSet(values: string[]): Set<string> {
  return new Set(values.map((entry) => entry.trim()).filter(Boolean));
}

export function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a.values()) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function toBindingMap(bindings: EnvSecretBinding[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of bindings) {
    map.set(entry.envKey, entry.secretRef);
  }
  return map;
}

export function isPlaceholderSecretRef(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with-your-secret-manager-path") ||
    normalized.includes("changeme") ||
    normalized.includes("todo") ||
    normalized.includes("{{") ||
    normalized.includes("}}")
  );
}

export function isRndDefaultSecretRef(
  value: string,
  rndDefaultSecretRefPrefix: string
): boolean {
  return value.toLowerCase().startsWith(rndDefaultSecretRefPrefix.toLowerCase());
}

export function addCheck(
  checks: ReadinessCheck[],
  id: string,
  passed: boolean,
  passDetail: string,
  failDetail: string
): void {
  checks.push({
    id,
    passed,
    detail: passed ? passDetail : failDetail,
  });
}

export function buildReadinessCheckContext(
  options: BuildReadinessChecksOptions,
  summary: SchedulerHandoffValidationSummary,
  infra: SchedulerInfraBindingArtifact
): ReadinessCheckContext {
  const checks: ReadinessCheck[] = [];
  const summaryRequiredEnvSet = toStringSet(summary.secrets.requiredEnvKeys);
  const infraRequiredEnvSet = toStringSet(infra.secrets.requiredEnvKeys);
  const summaryBindingMap = toBindingMap(summary.secrets.boundSecretRefs);
  const infraBindingMap = toBindingMap(infra.secrets.bindings);
  return {
    options,
    summary,
    infra,
    checks,
    summaryRequiredEnvSet,
    infraRequiredEnvSet,
    summaryBindingMap,
    infraBindingMap,
    infraSecretRefs: [...infraBindingMap.values()],
  };
}
