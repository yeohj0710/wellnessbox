export type Module03Kpi06OpsSchemaMap = {
  module: "03_personal_safety_validation_engine";
  kpiId: "kpi-06";
  source: {
    system: string;
    table: string;
    timezone: string;
    lookbackMonths: number;
  };
  fieldMap: {
    eventId: string;
    caseId: string;
    reportedAt: string;
    linkedToEngineRecommendation: string;
  };
  truthyValues: string[];
};

export type CliArgs = {
  inputPath: string;
  schemaMapPath: string | null;
  outPath: string | null;
  evaluatedAt: string | null;
};

export const MODULE_ID = "03_personal_safety_validation_engine";
export const KPI_ID = "kpi-06";
