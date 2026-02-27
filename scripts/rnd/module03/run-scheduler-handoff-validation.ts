// RND: Module 03 KPI #6 one-command scheduler handoff validation runner.

import fs from "node:fs";
import { toWorkspacePath, writeJsonFile } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { buildValidationSummary } from "./scheduler-handoff-validation-artifacts";
import { parseArgs } from "./scheduler-handoff-validation-cli";
import {
  assertSchedulerRunnersAvailable,
  buildRuntimeEnvValues,
  buildValidationPaths,
  KPI_ID,
  MODULE_ID,
  resolveValidationInput,
  runDeploymentBundleGeneration,
  runDryRunValidation,
  runInfraBindingGeneration,
  toRuntimeEnvOverrides,
} from "./scheduler-handoff-validation-runtime";

function main() {
  assertSchedulerRunnersAvailable();

  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const paths = buildValidationPaths(args.outDir);
  const inputResolution = resolveValidationInput(args, paths.generatedInputPath);
  const deploymentBundle = runDeploymentBundleGeneration(args, paths);
  const { secretBindingMap, sortedRequiredEnvKeys } = runInfraBindingGeneration(
    deploymentBundle,
    args,
    paths
  );
  const runtimeEnvValueMap = buildRuntimeEnvValues(deploymentBundle, args.envValuePairs);
  const dryRunReport = runDryRunValidation(
    args,
    paths,
    inputResolution.resolvedInputPath,
    toRuntimeEnvOverrides(runtimeEnvValueMap)
  );
  const inputRowCount = Array.isArray(inputResolution.inputRows)
    ? inputResolution.inputRows.length
    : 0;
  const summary = buildValidationSummary({
    moduleId: MODULE_ID,
    kpiId: KPI_ID,
    generatedAt: new Date().toISOString(),
    windowEnd: args.windowEnd,
    strictEnv: args.strictEnv,
    schedulerName: args.schedulerName,
    schedulerEnvironment: args.environment,
    hasInputPath: Boolean(args.inputPath),
    resolvedInputPath: inputResolution.resolvedInputPath,
    inputRowCount,
    sortedRequiredEnvKeys,
    secretBindingMap,
    runtimeEnvValueMap,
    outDir: args.outDir,
    deploymentBundlePath: paths.bundlePath,
    infraBindingPath: paths.infraBindingPath,
    dryRunReportPath: paths.dryRunReportPath,
    dryRunReport,
  });

  writeJsonFile(paths.summaryPath, summary);
  console.log(
    `Wrote Module 03 KPI #6 scheduler handoff validation summary: ${toWorkspacePath(paths.summaryPath)}`
  );
}

main();
