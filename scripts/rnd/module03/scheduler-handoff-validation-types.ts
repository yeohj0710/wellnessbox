export type ExpectedIdentity = {
  moduleId: string;
  kpiId: string;
};

export type SchedulerDeploymentBundle = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_deployment_bundle";
  generatedAt: string;
  secrets: {
    requiredEnvKeys: string[];
    failureWebhookEnvKey: string;
    failureWebhookTimeoutEnvKey: string;
  };
  verification: {
    expectedOutputs: string[];
  };
};

export type SchedulerDryRunReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_dry_run_report";
  verification: {
    allExpectedOutputsPresent: boolean;
    expectedOutputs: Array<{
      path: string;
      exists: boolean;
    }>;
  };
  dryRun: {
    missingRequiredEnvKeys: string[];
  };
};

export type Module03SchedulerHandoffValidationSummary = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_handoff_validation";
  generatedAt: string;
  windowEnd: string;
  strictEnv: boolean;
  scheduler: {
    name: string;
    environment: string;
  };
  input: {
    source: "provided_input" | "generated_representative_window";
    path: string;
    rowCount: number;
  };
  secrets: {
    requiredEnvKeys: string[];
    boundSecretRefs: Array<{
      envKey: string;
      secretRef: string;
    }>;
    runtimeEnvKeysInjected: string[];
  };
  artifacts: {
    outDir: string;
    deploymentBundlePath: string;
    infraBindingPath: string;
    dryRunReportPath: string;
  };
  verification: {
    expectedOutputs: Array<{
      path: string;
      exists: boolean;
    }>;
    allExpectedOutputsPresent: boolean;
    missingRequiredEnvKeys: string[];
  };
};

export type BuildValidationSummaryOptions = {
  moduleId: string;
  kpiId: string;
  generatedAt: string;
  windowEnd: string;
  strictEnv: boolean;
  schedulerName: string;
  schedulerEnvironment: string;
  hasInputPath: boolean;
  resolvedInputPath: string;
  inputRowCount: number;
  sortedRequiredEnvKeys: string[];
  secretBindingMap: Map<string, string>;
  runtimeEnvValueMap: Map<string, string>;
  outDir: string;
  deploymentBundlePath: string;
  infraBindingPath: string;
  dryRunReportPath: string;
  dryRunReport: SchedulerDryRunReport;
};
