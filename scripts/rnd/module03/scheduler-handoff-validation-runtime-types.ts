export type ValidationPaths = {
  archiveDir: string;
  handoffDir: string;
  failureAlertDir: string;
  bundlePath: string;
  infraBindingPath: string;
  dryRunReportPath: string;
  summaryPath: string;
  generatedInputPath: string;
};

export type ValidationInputResolution = {
  inputRows: unknown[];
  resolvedInputPath: string;
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
