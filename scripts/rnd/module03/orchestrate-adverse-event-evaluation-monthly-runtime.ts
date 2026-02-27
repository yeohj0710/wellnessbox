import path from "node:path";
import { assertRequiredEnvironment } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { buildHandoffOutputs, printSchedulerSummary, writeHandoffOutputs } from "./orchestrate-adverse-event-evaluation-monthly-artifacts";
import { DEFAULT_EXPORT_DIR } from "./orchestrate-adverse-event-evaluation-monthly-cli";
import {
  readArchiveLatest,
  readArchiveManifestEntryCount,
  readExportRows,
  resolveExportInput,
  runArchiveEvaluation,
} from "./orchestrate-adverse-event-evaluation-monthly-export";
import {
  KPI_ID,
  MODULE_ID,
  type CliArgs,
  type SchedulerExecutionResult,
} from "./orchestrate-adverse-event-evaluation-monthly-types";

const ARCHIVE_RUNNER_PATH = path.resolve(
  process.cwd(),
  "scripts",
  "rnd",
  "module03",
  "run-adverse-event-evaluation-archive.cjs"
);

function warnWhenInputTakesPrecedence(args: CliArgs): void {
  if (args.inputPath && args.exportCommand) {
    console.warn(
      "Both --input and --export-command were provided; --input takes precedence and export command is skipped."
    );
  }
}

function runArchiveAndReadResults(args: CliArgs): SchedulerExecutionResult {
  const exportResult = resolveExportInput(args, DEFAULT_EXPORT_DIR);
  const exportRows = readExportRows(exportResult.exportInputPath);
  runArchiveEvaluation(exportResult.exportInputPath, args, ARCHIVE_RUNNER_PATH);

  const latestPath = path.join(args.archiveDir, "latest.json");
  const manifestPath = path.join(args.archiveDir, "archive-manifest.json");

  return {
    exportInputPath: exportResult.exportInputPath,
    exportRows,
    exportSource: exportResult.exportSource,
    resolvedExportCommand: exportResult.resolvedExportCommand,
    latestPath,
    manifestPath,
    manifestEntryCount: readArchiveManifestEntryCount(manifestPath),
    archiveLatest: readArchiveLatest(latestPath, {
      moduleId: MODULE_ID,
      kpiId: KPI_ID,
    }),
  };
}

export function runScheduler(args: CliArgs): void {
  warnWhenInputTakesPrecedence(args);
  assertRequiredEnvironment(args.requiredEnvKeys);
  const execution = runArchiveAndReadResults(args);
  const outputs = buildHandoffOutputs(args, execution);
  writeHandoffOutputs(args, outputs);
  printSchedulerSummary(execution, outputs.handoffPath);
}
