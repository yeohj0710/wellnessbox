import type {
  SchedulerHandoffValidationSummary,
  SchedulerInfraBindingArtifact,
} from "./scheduler-readiness-artifacts";
import {
  addExecutionChecks,
  addInputAndEnvironmentChecks,
} from "./scheduler-readiness-checks.execution";
import {
  addRequiredEnvCoverageChecks,
  addSchedulerTemplateCheck,
  addSecretRefChecks,
} from "./scheduler-readiness-checks.integrity";
import { buildReadinessCheckContext } from "./scheduler-readiness-checks.shared";
import type {
  BuildReadinessChecksOptions,
  ReadinessCheck,
} from "./scheduler-readiness-checks.types";

export type { BuildReadinessChecksOptions, ReadinessCheck };

export function buildReadinessChecks(
  options: BuildReadinessChecksOptions,
  summary: SchedulerHandoffValidationSummary,
  infra: SchedulerInfraBindingArtifact
): ReadinessCheck[] {
  const context = buildReadinessCheckContext(options, summary, infra);

  addExecutionChecks(context);
  addInputAndEnvironmentChecks(context);
  addRequiredEnvCoverageChecks(context);
  addSecretRefChecks(context);
  addSchedulerTemplateCheck(context);

  return context.checks;
}
