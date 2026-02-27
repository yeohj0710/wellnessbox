export type SchedulerDeploymentBundle = {
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

export type SchedulerInfraBindingArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_infra_binding";
  generatedAt: string;
  environment: string;
  sourceBundlePath: string;
  scheduler: {
    name: string;
    cadenceCron: string;
    timezone: string;
    npmScript: "rnd:module03:evaluation:adverse:ops:scheduler";
    commandTemplate: string;
    commandArgs: string[];
  };
  secrets: {
    requiredEnvKeys: string[];
    boundEnvKeys: string[];
    missingEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
    bindings: Array<{
      envKey: string;
      secretRef: string;
    }>;
  };
  warehouse: SchedulerDeploymentBundle["warehouse"];
  artifacts: SchedulerDeploymentBundle["artifacts"];
  verification: SchedulerDeploymentBundle["verification"];
};

export type InfraBindingBuildOptions = {
  bundlePath: string;
  generatedAt: string | null;
  schedulerName: string;
  environment: string;
  allowPlaceholderSecretRefs: boolean;
};
