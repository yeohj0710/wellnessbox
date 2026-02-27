export type CliArgs = {
  infraBindingPath: string;
  inputPath: string;
  outPath: string | null;
  windowEnd: string;
  strictEnv: boolean;
};

export type Module03SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  scheduler: {
    commandArgs: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
  };
  warehouse: {
    schemaMapPath: string;
  };
  artifacts: {
    archiveDir: string;
    handoffDir: string;
    failureAlertDir: string;
  };
  verification: {
    expectedOutputs: string[];
  };
};

export type DryRunOutputVerification = {
  path: string;
  exists: boolean;
};

export type SchedulerDryRunPlan = {
  schedulerArgs: string[];
  missingRequiredEnvKeys: string[];
  appliedRetentionMonths: number | null;
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
