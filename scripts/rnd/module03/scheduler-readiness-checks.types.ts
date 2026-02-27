import type {
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

export type ReadinessCheckContext = {
  options: BuildReadinessChecksOptions;
  summary: SchedulerHandoffValidationSummary;
  infra: SchedulerInfraBindingArtifact;
  checks: ReadinessCheck[];
  summaryRequiredEnvSet: Set<string>;
  infraRequiredEnvSet: Set<string>;
  summaryBindingMap: Map<string, string>;
  infraBindingMap: Map<string, string>;
  infraSecretRefs: string[];
};
