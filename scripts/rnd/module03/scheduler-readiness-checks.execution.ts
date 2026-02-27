import { addCheck } from "./scheduler-readiness-checks.shared";
import type { ReadinessCheckContext } from "./scheduler-readiness-checks.types";

export function addExecutionChecks(context: ReadinessCheckContext): void {
  const { checks, summary } = context;

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
}

export function addInputAndEnvironmentChecks(context: ReadinessCheckContext): void {
  const { checks, options, summary, infra } = context;

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
}
