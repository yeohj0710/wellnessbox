import path from "node:path";
import { readJsonFile } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { assertRunnerExists, runNodeScript } from "./node-script-runner";
import {
  parseDeploymentBundle,
  parseDryRunReport,
  type SchedulerDeploymentBundle,
  type SchedulerDryRunReport,
} from "./scheduler-handoff-validation-artifacts";
import type { CliArgs } from "./scheduler-handoff-validation-cli";
import { buildSecretBindingMap } from "./scheduler-handoff-validation-runtime-exec-env";
import {
  KPI_ID,
  MODULE_ID,
  type ValidationPaths,
} from "./scheduler-handoff-validation-runtime-types";

const BUNDLE_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-generate-scheduler-deployment-bundle.cjs"
);
const INFRA_BINDING_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-generate-scheduler-infra-binding.cjs"
);
const DRY_RUN_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-scheduler-dry-run-window.cjs"
);

export function assertSchedulerRunnersAvailable(): void {
  assertRunnerExists(BUNDLE_RUNNER_PATH, "Module 03 deployment-bundle");
  assertRunnerExists(INFRA_BINDING_RUNNER_PATH, "Module 03 infra-binding");
  assertRunnerExists(DRY_RUN_RUNNER_PATH, "Module 03 scheduler dry-run");
}

export function runDeploymentBundleGeneration(
  args: CliArgs,
  paths: ValidationPaths
): SchedulerDeploymentBundle {
  const bundleArgs = [
    "--out",
    paths.bundlePath,
    "--archive-dir",
    paths.archiveDir,
    "--handoff-dir",
    paths.handoffDir,
    "--failure-alert-dir",
    paths.failureAlertDir,
    "--require-env",
    args.requiredEnvKeys.join(","),
    "--generated-at",
    new Date().toISOString(),
  ];
  runNodeScript(BUNDLE_RUNNER_PATH, bundleArgs, { throwOnFailure: true });

  const deploymentBundleRaw = readJsonFile(paths.bundlePath);
  return parseDeploymentBundle(deploymentBundleRaw, paths.bundlePath, {
    moduleId: MODULE_ID,
    kpiId: KPI_ID,
  });
}

export function runInfraBindingGeneration(
  deploymentBundle: SchedulerDeploymentBundle,
  args: CliArgs,
  paths: ValidationPaths
): {
  secretBindingMap: Map<string, string>;
  sortedRequiredEnvKeys: string[];
} {
  const secretBindingMap = buildSecretBindingMap(
    deploymentBundle.secrets.requiredEnvKeys,
    args.secretBindingPairs
  );
  const sortedRequiredEnvKeys = [...deploymentBundle.secrets.requiredEnvKeys].sort();

  const infraBindingArgs = [
    "--bundle",
    paths.bundlePath,
    "--out",
    paths.infraBindingPath,
    "--scheduler-name",
    args.schedulerName,
    "--environment",
    args.environment,
  ];
  for (const envKey of sortedRequiredEnvKeys) {
    infraBindingArgs.push(
      "--secret-binding",
      `${envKey}=${secretBindingMap.get(envKey) as string}`
    );
  }
  runNodeScript(INFRA_BINDING_RUNNER_PATH, infraBindingArgs, {
    throwOnFailure: true,
  });

  return { secretBindingMap, sortedRequiredEnvKeys };
}

export function runDryRunValidation(
  args: CliArgs,
  paths: ValidationPaths,
  resolvedInputPath: string,
  runtimeEnvOverrides: Record<string, string>
): SchedulerDryRunReport {
  const dryRunArgs = [
    "--infra-binding",
    paths.infraBindingPath,
    "--input",
    resolvedInputPath,
    "--window-end",
    args.windowEnd,
    "--out",
    paths.dryRunReportPath,
  ];
  if (args.strictEnv) {
    dryRunArgs.push("--strict-env");
  }
  runNodeScript(DRY_RUN_RUNNER_PATH, dryRunArgs, {
    envOverrides: runtimeEnvOverrides,
    throwOnFailure: true,
  });

  const dryRunReportRaw = readJsonFile(paths.dryRunReportPath);
  const dryRunReport = parseDryRunReport(dryRunReportRaw, paths.dryRunReportPath, {
    moduleId: MODULE_ID,
    kpiId: KPI_ID,
  });
  if (!dryRunReport.verification.allExpectedOutputsPresent) {
    throw new Error("Dry-run verification failed: expected outputs were not all present.");
  }

  return dryRunReport;
}
