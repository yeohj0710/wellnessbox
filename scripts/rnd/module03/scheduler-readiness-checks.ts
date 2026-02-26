import type {
  EnvSecretBinding,
  SchedulerHandoffValidationSummary,
  SchedulerInfraBindingArtifact,
} from "./scheduler-readiness-artifacts";

export type ReadinessCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type BuildReadinessChecksOptions = {
  expectedEnvironment: string;
  requireProvidedInput: boolean;
  allowRndDefaultSecretRefs: boolean;
  rndDefaultSecretRefPrefix: string;
};

function toStringSet(values: string[]): Set<string> {
  return new Set(values.map((entry) => entry.trim()).filter(Boolean));
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
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

function isPlaceholderSecretRef(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with-your-secret-manager-path") ||
    normalized.includes("changeme") ||
    normalized.includes("todo") ||
    normalized.includes("{{") ||
    normalized.includes("}}")
  );
}

function isRndDefaultSecretRef(value: string, rndDefaultSecretRefPrefix: string): boolean {
  return value.toLowerCase().startsWith(rndDefaultSecretRefPrefix.toLowerCase());
}

function addCheck(
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

export function buildReadinessChecks(
  options: BuildReadinessChecksOptions,
  summary: SchedulerHandoffValidationSummary,
  infra: SchedulerInfraBindingArtifact
): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];

  addCheck(
    checks,
    "strict-env-enabled",
    summary.strictEnv,
    "Handoff validation used strict environment checks.",
    "Handoff validation did not use strict environment checks."
  );

  addCheck(
    checks,
    "dry-run-expected-outputs",
    summary.verification.allExpectedOutputsPresent,
    "Dry-run verification confirms all expected outputs are present.",
    "Dry-run verification reports missing expected outputs."
  );

  addCheck(
    checks,
    "dry-run-required-env-complete",
    summary.verification.missingRequiredEnvKeys.length === 0,
    "Dry-run verification reports no missing required env keys.",
    `Dry-run verification missing required env key(s): ${summary.verification.missingRequiredEnvKeys.join(", ")}.`
  );

  if (options.requireProvidedInput) {
    addCheck(
      checks,
      "provided-input-required",
      summary.input.source === "provided_input",
      "Handoff validation consumed a provided input window as required.",
      `Handoff validation input source is "${summary.input.source}" but --require-provided-input requires "provided_input".`
    );
  } else {
    addCheck(
      checks,
      "provided-input-required",
      true,
      "Provided input enforcement is not required for this run.",
      ""
    );
  }

  addCheck(
    checks,
    "summary-environment-match",
    summary.scheduler.environment === options.expectedEnvironment,
    `Handoff summary environment matches expected "${options.expectedEnvironment}".`,
    `Handoff summary environment "${summary.scheduler.environment}" does not match expected "${options.expectedEnvironment}".`
  );

  addCheck(
    checks,
    "infra-environment-match",
    infra.environment === options.expectedEnvironment,
    `Infra binding environment matches expected "${options.expectedEnvironment}".`,
    `Infra binding environment "${infra.environment}" does not match expected "${options.expectedEnvironment}".`
  );

  const summaryRequiredEnvSet = toStringSet(summary.secrets.requiredEnvKeys);
  const infraRequiredEnvSet = toStringSet(infra.secrets.requiredEnvKeys);
  addCheck(
    checks,
    "required-env-keyset-match",
    areSetsEqual(summaryRequiredEnvSet, infraRequiredEnvSet),
    "Summary and infra binding contain the same required env key set.",
    "Summary and infra binding required env key sets differ."
  );

  addCheck(
    checks,
    "infra-missing-env-keys",
    infra.secrets.missingEnvKeys.length === 0,
    "Infra binding reports no missing env keys.",
    `Infra binding missing env key(s): ${infra.secrets.missingEnvKeys.join(", ")}.`
  );

  const summaryBindingMap = toBindingMap(summary.secrets.boundSecretRefs);
  const infraBindingMap = toBindingMap(infra.secrets.bindings);
  const missingSummaryBindings = [...summaryRequiredEnvSet].filter(
    (envKey) => !summaryBindingMap.has(envKey)
  );
  addCheck(
    checks,
    "summary-secret-binding-coverage",
    missingSummaryBindings.length === 0,
    "Handoff summary has secret bindings for all required env keys.",
    `Handoff summary missing binding(s) for env key(s): ${missingSummaryBindings.join(", ")}.`
  );

  const missingInfraBindings = [...infraRequiredEnvSet].filter((envKey) => !infraBindingMap.has(envKey));
  addCheck(
    checks,
    "infra-secret-binding-coverage",
    missingInfraBindings.length === 0,
    "Infra binding has secret bindings for all required env keys.",
    `Infra binding missing binding(s) for env key(s): ${missingInfraBindings.join(", ")}.`
  );

  const mismatchedBindings = [...summaryRequiredEnvSet]
    .filter(
      (envKey) =>
        summaryBindingMap.has(envKey) &&
        infraBindingMap.has(envKey) &&
        summaryBindingMap.get(envKey) !== infraBindingMap.get(envKey)
    )
    .map((envKey) => `${envKey}`);
  addCheck(
    checks,
    "summary-infra-binding-consistency",
    mismatchedBindings.length === 0,
    "Summary and infra binding secret refs are consistent.",
    `Summary/infra binding mismatch for env key(s): ${mismatchedBindings.join(", ")}.`
  );

  const infraSecretRefs = [...infraBindingMap.values()];
  const placeholderRefs = infraSecretRefs.filter((secretRef) => isPlaceholderSecretRef(secretRef));
  addCheck(
    checks,
    "no-placeholder-secret-refs",
    placeholderRefs.length === 0,
    "Infra binding secret refs are non-placeholder values.",
    `Placeholder secret ref(s) detected: ${placeholderRefs.join(", ")}.`
  );

  if (options.allowRndDefaultSecretRefs) {
    addCheck(
      checks,
      "no-rnd-default-secret-refs",
      true,
      "Default RND secret refs allowed by flag (--allow-rnd-default-secret-ref).",
      ""
    );
  } else {
    const defaultRndRefs = infraSecretRefs.filter((secretRef) =>
      isRndDefaultSecretRef(secretRef, options.rndDefaultSecretRefPrefix)
    );
    addCheck(
      checks,
      "no-rnd-default-secret-refs",
      defaultRndRefs.length === 0,
      "Infra binding secret refs are not using RND placeholder defaults.",
      `RND default secret ref(s) detected: ${defaultRndRefs.join(", ")}.`
    );
  }

  addCheck(
    checks,
    "scheduler-command-template-present",
    infra.scheduler.commandTemplate.includes(
      "npm run rnd:module03:evaluation:adverse:ops:scheduler --"
    ),
    "Infra binding carries the expected scheduler command template.",
    "Infra binding command template does not include the expected scheduler npm command."
  );

  return checks;
}
