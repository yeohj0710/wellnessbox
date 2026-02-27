import { toWorkspacePath } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  BuildValidationSummaryOptions,
  Module03SchedulerHandoffValidationSummary,
  SchedulerDryRunReport,
} from "./scheduler-handoff-validation-types";

export function buildSummaryInputSection(
  hasInputPath: boolean,
  resolvedInputPath: string,
  rowCount: number
): Module03SchedulerHandoffValidationSummary["input"] {
  return {
    source: hasInputPath ? "provided_input" : "generated_representative_window",
    path: resolvedInputPath,
    rowCount,
  };
}

export function buildSummarySecretsSection(
  sortedRequiredEnvKeys: string[],
  secretBindingMap: Map<string, string>,
  runtimeEnvValueMap: Map<string, string>
): Module03SchedulerHandoffValidationSummary["secrets"] {
  return {
    requiredEnvKeys: sortedRequiredEnvKeys,
    boundSecretRefs: sortedRequiredEnvKeys.map((envKey) => ({
      envKey,
      secretRef: secretBindingMap.get(envKey) as string,
    })),
    runtimeEnvKeysInjected: [...runtimeEnvValueMap.keys()].sort(),
  };
}

export function buildSummaryVerificationSection(
  dryRunReport: SchedulerDryRunReport
): Module03SchedulerHandoffValidationSummary["verification"] {
  return {
    expectedOutputs: dryRunReport.verification.expectedOutputs,
    allExpectedOutputsPresent: dryRunReport.verification.allExpectedOutputsPresent,
    missingRequiredEnvKeys: dryRunReport.dryRun.missingRequiredEnvKeys,
  };
}

function buildSummaryArtifactsSection(
  outDir: string,
  deploymentBundlePath: string,
  infraBindingPath: string,
  dryRunReportPath: string
): Module03SchedulerHandoffValidationSummary["artifacts"] {
  return {
    outDir: toWorkspacePath(outDir),
    deploymentBundlePath: toWorkspacePath(deploymentBundlePath),
    infraBindingPath: toWorkspacePath(infraBindingPath),
    dryRunReportPath: toWorkspacePath(dryRunReportPath),
  };
}

export function buildValidationSummary(
  options: BuildValidationSummaryOptions
): Module03SchedulerHandoffValidationSummary {
  const input = buildSummaryInputSection(
    options.hasInputPath,
    toWorkspacePath(options.resolvedInputPath),
    options.inputRowCount
  );
  const secrets = buildSummarySecretsSection(
    options.sortedRequiredEnvKeys,
    options.secretBindingMap,
    options.runtimeEnvValueMap
  );
  const artifacts = buildSummaryArtifactsSection(
    options.outDir,
    options.deploymentBundlePath,
    options.infraBindingPath,
    options.dryRunReportPath
  );
  const verification = buildSummaryVerificationSection(options.dryRunReport);

  return {
    module: options.moduleId as Module03SchedulerHandoffValidationSummary["module"],
    phase: "EVALUATION",
    kpiId: options.kpiId as Module03SchedulerHandoffValidationSummary["kpiId"],
    artifact: "scheduler_handoff_validation",
    generatedAt: options.generatedAt,
    windowEnd: options.windowEnd,
    strictEnv: options.strictEnv,
    scheduler: {
      name: options.schedulerName,
      environment: options.schedulerEnvironment,
    },
    input,
    secrets,
    artifacts,
    verification,
  };
}
