import type {
  parseHandoffSummary,
  parseInfraBinding,
} from "./scheduler-readiness-artifacts";
import type { ReadinessCheck } from "./scheduler-readiness-checks";

export type CliArgs = {
  summaryPath: string;
  outPath: string;
  expectedEnvironment: string;
  requireProvidedInput: boolean;
  allowRndDefaultSecretRefs: boolean;
};

export type SchedulerProductionReadinessReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_readiness_report";
  generatedAt: string;
  result: "pass" | "fail";
  expectedEnvironment: string;
  source: {
    summaryPath: string;
    infraBindingPath: string;
  };
  input: {
    source: "provided_input" | "generated_representative_window";
    path: string;
    rowCount: number;
    requireProvidedInput: boolean;
  };
  scheduler: {
    name: string;
    summaryEnvironment: string;
    infraEnvironment: string;
    commandTemplate: string;
  };
  checks: ReadinessCheck[];
  failures: string[];
};

export type ReadinessSource = {
  summary: ReturnType<typeof parseHandoffSummary>;
  infra: ReturnType<typeof parseInfraBinding>;
  resolvedInfraBindingPath: string;
};

export type ReadinessComputation = {
  checks: ReadinessCheck[];
  failedChecks: ReadinessCheck[];
};

export const DEFAULT_EXPECTED_ENVIRONMENT = "production";
export const DEFAULT_OUT_FILENAME = "scheduler-production-readiness-report.json";
export const DEFAULT_RND_SECRET_REF_PREFIX = "secret://rnd/module03/kpi06/";
