export type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  cadenceCron: string;
  timezone: string;
  retentionMonths: number;
  requiredEnvKeys: string[];
  exportCommandTemplate: string;
  schemaMapPath: string;
  sqlTemplatePath: string;
  archiveDir: string;
  handoffDir: string;
  failureAlertDir: string;
  failureWebhookEnvKey: string;
  failureWebhookTimeoutEnvKey: string;
};

export type Module03SchedulerDeploymentBundle = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_deployment_bundle";
  generatedAt: string;
  scheduler: {
    cadenceCron: string;
    timezone: string;
    npmScript: "rnd:module03:evaluation:adverse:ops:scheduler";
    commandTemplate: string;
    commandArgs: string[];
  };
  warehouse: {
    exportCommandTemplate: string;
    sqlTemplatePath: string;
    schemaMapPath: string;
    placeholders: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
    bindingsTemplate: Array<{
      envKey: string;
      secretRef: string;
    }>;
  };
  artifacts: {
    archiveDir: string;
    handoffDir: string;
    failureAlertDir: string;
  };
  verification: {
    dryRunCommandWithInput: string;
    expectedOutputs: string[];
  };
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
