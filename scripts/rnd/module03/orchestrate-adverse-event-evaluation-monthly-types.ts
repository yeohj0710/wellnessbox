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
