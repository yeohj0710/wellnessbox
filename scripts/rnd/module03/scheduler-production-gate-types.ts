import type { NodeScriptRunResult as CommandRunResult } from "./node-script-runner";

export type CliArgs = {
  outDir: string;
  windowEnd: string;
  inputPath: string | null;
  requireProvidedInput: boolean;
  requiredEnvKeysCsv: string | null;
  schedulerName: string | null;
  environment: string;
  expectedEnvironment: string;
  strictEnv: boolean;
  sampleRowCount: number | null;
  secretBindingPairs: string[];
  envValuePairs: string[];
  allowRndDefaultSecretRefs: boolean;
};

export type SchedulerProductionReadinessReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_readiness_report";
  result: "pass" | "fail";
  failures: string[];
};

export type Module03SchedulerProductionGateArtifact = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "scheduler_production_gate";
  generatedAt: string;
  result: "pass" | "fail";
  expectedEnvironment: string;
  environment: string;
  inputs: {
    outDir: string;
    windowEnd: string;
    inputPath: string | null;
    requireProvidedInput: boolean;
  };
  artifacts: {
    handoffSummaryPath: string;
    readinessReportPath: string;
  };
  commands: {
    handoffValidation: Pick<CommandRunResult, "command" | "exitCode" | "succeeded">;
    readinessValidation: Pick<CommandRunResult, "command" | "exitCode" | "succeeded">;
  };
  readiness: {
    reportResult: "pass" | "fail" | "missing";
    failures: string[];
  };
};

export type ProductionGatePaths = {
  handoffOutDir: string;
  handoffSummaryPath: string;
  readinessReportPath: string;
  gateArtifactPath: string;
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
