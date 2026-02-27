export type Module03Kpi06OpsOutput = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  generatedAt: string;
  evaluatedAt: string;
  sourceRowCount: number;
  report: {
    windowStart: string;
    windowEnd: string;
    countedEventCount: number;
    targetMaxCountPerYear: number;
    targetSatisfied: boolean;
  };
};

export type Module03Kpi06ArchiveEntry = {
  month: string;
  archivedAt: string;
  evaluatedAt: string;
  windowStart: string;
  windowEnd: string;
  sourceRowCount: number;
  countedEventCount: number;
  targetMaxCountPerYear: number;
  targetSatisfied: boolean;
  inputPath: string;
  schemaMapPath: string | null;
  reportPath: string;
};

export type Module03Kpi06ArchiveManifest = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  artifact: "monthly_archive";
  generatedAt: string;
  archiveDir: string;
  entries: Module03Kpi06ArchiveEntry[];
  retentionPolicy?: {
    retentionMonths: number | null;
    cutoffMonth: string | null;
    appliedAt: string;
    prunedEntryCount: number;
    prunedReportCount: number;
    prunedMonths: string[];
  };
};

export type RetentionPolicyResult = {
  entries: Module03Kpi06ArchiveEntry[];
  cutoffMonth: string | null;
  prunedEntries: Module03Kpi06ArchiveEntry[];
  prunedReportCount: number;
  prunedMonths: string[];
};

export type ArchiveExecutionPaths = {
  monthArchiveDir: string;
  reportPath: string;
  manifestPath: string;
  latestPath: string;
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
export const MANIFEST_FILE_NAME = "archive-manifest.json";
