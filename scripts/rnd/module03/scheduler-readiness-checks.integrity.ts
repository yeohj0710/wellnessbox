import {
  addCheck,
  areSetsEqual,
  isPlaceholderSecretRef,
  isRndDefaultSecretRef,
} from "./scheduler-readiness-checks.shared";
import type { ReadinessCheckContext } from "./scheduler-readiness-checks.types";

export function addRequiredEnvCoverageChecks(context: ReadinessCheckContext): void {
  const {
    checks,
    infra,
    summaryRequiredEnvSet,
    infraRequiredEnvSet,
    summaryBindingMap,
    infraBindingMap,
  } = context;

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

  const missingInfraBindings = [...infraRequiredEnvSet].filter(
    (envKey) => !infraBindingMap.has(envKey)
  );
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
}

export function addSecretRefChecks(context: ReadinessCheckContext): void {
  const { checks, options, infraSecretRefs } = context;

  const placeholderRefs = infraSecretRefs.filter((secretRef) =>
    isPlaceholderSecretRef(secretRef)
  );
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
    return;
  }

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

export function addSchedulerTemplateCheck(context: ReadinessCheckContext): void {
  const { checks, infra } = context;

  addCheck(
    checks,
    "scheduler-command-template-present",
    infra.scheduler.commandTemplate.includes(
      "npm run rnd:module03:evaluation:adverse:ops:scheduler --"
    ),
    "Infra binding carries the expected scheduler command template.",
    "Infra binding command template does not include the expected scheduler npm command."
  );
}
