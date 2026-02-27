import type {
  Module03AdverseEventSample,
  evaluateModule03AdverseEventCount,
} from "../../../lib/rnd/module03-personal-safety/evaluation";
import type { Module03Kpi06OpsSchemaMap } from "./evaluate-adverse-event-count-from-source-types";
import { KPI_ID, MODULE_ID } from "./evaluate-adverse-event-count-from-source-types";

export function buildOpsEvaluationOutput(params: {
  schemaMapPath: string;
  sqlTemplatePath: string;
  schemaMap: Module03Kpi06OpsSchemaMap;
  samples: Module03AdverseEventSample[];
  report: ReturnType<typeof evaluateModule03AdverseEventCount>;
}): {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  generatedAt: string;
  evaluatedAt: string;
  kpiId: "kpi-06";
  adapter: {
    schemaMapPath: string;
    sqlTemplatePath: string;
    sourceSystem: string;
    sourceTable: string;
    sourceTimezone: string;
    sourceLookbackMonths: number;
    mappedFields: Module03Kpi06OpsSchemaMap["fieldMap"];
  };
  sourceRowCount: number;
  report: ReturnType<typeof evaluateModule03AdverseEventCount>;
  adverseEventSamples: Module03AdverseEventSample[];
} {
  return {
    module: MODULE_ID,
    phase: "EVALUATION",
    generatedAt: new Date().toISOString(),
    evaluatedAt: params.report.evaluatedAt,
    kpiId: KPI_ID,
    adapter: {
      schemaMapPath: params.schemaMapPath,
      sqlTemplatePath: params.sqlTemplatePath,
      sourceSystem: params.schemaMap.source.system,
      sourceTable: params.schemaMap.source.table,
      sourceTimezone: params.schemaMap.source.timezone,
      sourceLookbackMonths: params.schemaMap.source.lookbackMonths,
      mappedFields: params.schemaMap.fieldMap,
    },
    sourceRowCount: params.samples.length,
    report: params.report,
    adverseEventSamples: params.samples,
  };
}
