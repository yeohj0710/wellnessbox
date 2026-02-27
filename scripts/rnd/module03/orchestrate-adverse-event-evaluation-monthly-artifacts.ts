import path from "node:path";
import {
  toPathSafeTimestamp,
  toPosixPath,
  toWorkspacePath,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type {
  CliArgs,
  HandoffOutputBundle,
  SchedulerExecutionResult,
} from "./orchestrate-adverse-event-evaluation-monthly-types";
import { KPI_ID, MODULE_ID } from "./orchestrate-adverse-event-evaluation-monthly-types";

function buildHandoffArtifact(
  args: CliArgs,
  execution: SchedulerExecutionResult,
  handoffGeneratedAt: string,
  relativeReportPath: string
): HandoffOutputBundle["handoffArtifact"] {
  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "warehouse_export_handoff",
    generatedAt: handoffGeneratedAt,
    windowEnd: args.windowEnd,
    scheduler: {
      exportSource: execution.exportSource,
      retentionMonths: args.retentionMonths,
      requiredEnvKeys: args.requiredEnvKeys,
      missingRequiredEnvKeys: [],
      exportCommandTemplate: args.exportCommand,
      resolvedExportCommand: execution.resolvedExportCommand,
      sqlTemplatePath: toWorkspacePath(args.sqlTemplatePath),
    },
    warehouseExport: {
      inputPath: toWorkspacePath(execution.exportInputPath),
      rowCount: execution.exportRows.length,
    },
    archive: {
      archiveDir: toWorkspacePath(args.archiveDir),
      latestPath: toWorkspacePath(execution.latestPath),
      manifestPath: toWorkspacePath(execution.manifestPath),
      manifestEntryCount: execution.manifestEntryCount,
      reportPath: toWorkspacePath(relativeReportPath),
      latestEntry: execution.archiveLatest.entry,
    },
  };
}

function buildHandoffLatestPointer(
  args: CliArgs,
  handoffPath: string,
  handoffGeneratedAt: string
): HandoffOutputBundle["latestPointer"] {
  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    kpiId: KPI_ID,
    artifact: "warehouse_export_handoff_latest",
    generatedAt: handoffGeneratedAt,
    handoffPath: toPosixPath(path.relative(args.handoffDir, handoffPath)),
  };
}

export function buildHandoffOutputs(
  args: CliArgs,
  execution: SchedulerExecutionResult
): HandoffOutputBundle {
  const handoffGeneratedAt = new Date().toISOString();
  const handoffMonth = execution.archiveLatest.entry.month;
  const handoffPath = path.join(
    args.handoffDir,
    handoffMonth,
    `kpi06-warehouse-handoff-${toPathSafeTimestamp(handoffGeneratedAt)}.json`
  );
  const relativeReportPath = path.join(args.archiveDir, execution.archiveLatest.entry.reportPath);

  return {
    handoffPath,
    handoffArtifact: buildHandoffArtifact(
      args,
      execution,
      handoffGeneratedAt,
      relativeReportPath
    ),
    latestPointer: buildHandoffLatestPointer(args, handoffPath, handoffGeneratedAt),
  };
}

export function writeHandoffOutputs(args: CliArgs, outputs: HandoffOutputBundle): void {
  writeJsonFile(outputs.handoffPath, outputs.handoffArtifact);
  writeJsonFile(path.join(args.handoffDir, "latest.json"), outputs.latestPointer);
}

export function printSchedulerSummary(execution: SchedulerExecutionResult, handoffPath: string): void {
  console.log(
    `Prepared Module 03 KPI #6 warehouse export input: ${toWorkspacePath(execution.exportInputPath)} (rows=${execution.exportRows.length})`
  );
  console.log(`Updated Module 03 KPI #6 archive: ${toWorkspacePath(execution.latestPath)}`);
  console.log(`Wrote Module 03 KPI #6 handoff artifact: ${toWorkspacePath(handoffPath)}`);
}
