import type { Module03ArchiveLatest } from "./orchestrate-adverse-event-evaluation-monthly-helpers";

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";

export type CliArgs = {
  inputPath: string | null;
  exportCommand: string | null;
  schemaMapPath: string | null;
  sqlTemplatePath: string;
  archiveDir: string;
  handoffDir: string;
  exportOutPath: string | null;
  windowEnd: string;
  retentionMonths: number | null;
  requiredEnvKeys: string[];
  failureAlertDir: string;
  failureWebhookUrl: string | null;
  failureWebhookTimeoutMs: number;
};

export type ExportSource = "provided_input" | "scheduled_export";

export type ResolvedExportInput = {
  exportInputPath: string;
  exportSource: ExportSource;
  resolvedExportCommand: string | null;
};

export type SchedulerExecutionResult = {
  exportInputPath: string;
  exportRows: unknown[];
  exportSource: ExportSource;
  resolvedExportCommand: string | null;
  latestPath: string;
  manifestPath: string;
  manifestEntryCount: number;
  archiveLatest: Module03ArchiveLatest;
};

export type HandoffOutputBundle = {
  handoffPath: string;
  handoffArtifact: {
    module: string;
    phase: "EVALUATION";
    kpiId: string;
    artifact: "warehouse_export_handoff";
    generatedAt: string;
    windowEnd: string;
    scheduler: {
      exportSource: ExportSource;
      retentionMonths: number | null;
      requiredEnvKeys: string[];
      missingRequiredEnvKeys: string[];
      exportCommandTemplate: string | null;
      resolvedExportCommand: string | null;
      sqlTemplatePath: string;
    };
    warehouseExport: {
      inputPath: string;
      rowCount: number;
    };
    archive: {
      archiveDir: string;
      latestPath: string;
      manifestPath: string;
      manifestEntryCount: number;
      reportPath: string;
      latestEntry: Module03ArchiveLatest["entry"];
    };
  };
  latestPointer: {
    module: string;
    phase: "EVALUATION";
    kpiId: string;
    artifact: "warehouse_export_handoff_latest";
    generatedAt: string;
    handoffPath: string;
  };
};
