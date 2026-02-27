export const MODULE03_MODULE_ID = "03_personal_safety_validation_engine";
export const MODULE03_KPI06_ID = "kpi-06";

export type SchedulerInputSource =
  | "provided_input"
  | "generated_representative_window";

export type EnvSecretBinding = {
  envKey: string;
  secretRef: string;
};

export type SchedulerHandoffValidationSummary = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_handoff_validation";
  strictEnv: boolean;
  input: {
    source: SchedulerInputSource;
    path: string;
    rowCount: number;
  };
  scheduler: {
    name: string;
    environment: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    boundSecretRefs: EnvSecretBinding[];
  };
  artifacts: {
    infraBindingPath: string;
  };
  verification: {
    allExpectedOutputsPresent: boolean;
    missingRequiredEnvKeys: string[];
  };
};

export type SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  environment: string;
  scheduler: {
    name: string;
    commandTemplate: string;
  };
  secrets: {
    requiredEnvKeys: string[];
    missingEnvKeys: string[];
    bindings: EnvSecretBinding[];
  };
};
