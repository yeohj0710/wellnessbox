import {
  assertNonEmptyString,
  isPlainObject,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { Module03AdverseEventSample } from "../../../lib/rnd/module03-personal-safety/evaluation";
import type { Module03Kpi06OpsSchemaMap } from "./evaluate-adverse-event-count-from-source-types";
import { KPI_ID, MODULE_ID } from "./evaluate-adverse-event-count-from-source-types";

const FALSY_VALUES = new Set(["false", "f", "0", "no", "n", "unlinked"]);

export function parseSchemaMap(
  raw: unknown,
  schemaMapPath: string
): Module03Kpi06OpsSchemaMap {
  if (!isPlainObject(raw)) {
    throw new Error(`Schema map at ${schemaMapPath} must be a JSON object.`);
  }

  const moduleId = assertNonEmptyString(raw.module, "schemaMap.module");
  const kpiId = assertNonEmptyString(raw.kpiId, "schemaMap.kpiId");
  if (moduleId !== MODULE_ID) {
    throw new Error(`schemaMap.module must be "${MODULE_ID}", received "${moduleId}".`);
  }
  if (kpiId !== KPI_ID) {
    throw new Error(`schemaMap.kpiId must be "${KPI_ID}", received "${kpiId}".`);
  }

  if (!isPlainObject(raw.source)) {
    throw new Error("schemaMap.source must be an object.");
  }
  const lookbackMonthsRaw = raw.source.lookbackMonths;
  if (
    typeof lookbackMonthsRaw !== "number" ||
    !Number.isInteger(lookbackMonthsRaw) ||
    lookbackMonthsRaw <= 0
  ) {
    throw new Error("schemaMap.source.lookbackMonths must be a positive integer.");
  }
  const lookbackMonths = lookbackMonthsRaw;

  if (!isPlainObject(raw.fieldMap)) {
    throw new Error("schemaMap.fieldMap must be an object.");
  }

  if (!Array.isArray(raw.truthyValues) || raw.truthyValues.length === 0) {
    throw new Error("schemaMap.truthyValues must contain at least one value.");
  }

  const truthyValues = raw.truthyValues.map((value, index) =>
    assertNonEmptyString(value, `schemaMap.truthyValues[${index}]`).toLowerCase()
  );

  return {
    module: MODULE_ID,
    kpiId: KPI_ID,
    source: {
      system: assertNonEmptyString(raw.source.system, "schemaMap.source.system"),
      table: assertNonEmptyString(raw.source.table, "schemaMap.source.table"),
      timezone: assertNonEmptyString(raw.source.timezone, "schemaMap.source.timezone"),
      lookbackMonths,
    },
    fieldMap: {
      eventId: assertNonEmptyString(raw.fieldMap.eventId, "schemaMap.fieldMap.eventId"),
      caseId: assertNonEmptyString(raw.fieldMap.caseId, "schemaMap.fieldMap.caseId"),
      reportedAt: assertNonEmptyString(
        raw.fieldMap.reportedAt,
        "schemaMap.fieldMap.reportedAt"
      ),
      linkedToEngineRecommendation: assertNonEmptyString(
        raw.fieldMap.linkedToEngineRecommendation,
        "schemaMap.fieldMap.linkedToEngineRecommendation"
      ),
    },
    truthyValues,
  };
}

function parseReportedAt(value: unknown, rowIndex: number, fieldName: string): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`rows[${rowIndex}].${fieldName} must be a datetime string or epoch number.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new Error(`rows[${rowIndex}].${fieldName} must be parseable as datetime.`);
  }
  return parsed.toISOString();
}

function parseBooleanLike(
  value: unknown,
  truthyValues: Set<string>,
  rowIndex: number,
  fieldName: string
): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (truthyValues.has(normalized)) {
      return true;
    }
    if (FALSY_VALUES.has(normalized)) {
      return false;
    }
  }

  throw new Error(
    `rows[${rowIndex}].${fieldName} must be boolean-like (configured truthy values, or false/0/no).`
  );
}

export function toSamples(
  rowsRaw: unknown,
  schemaMap: Module03Kpi06OpsSchemaMap
): Module03AdverseEventSample[] {
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) {
    throw new Error("Input JSON must be a non-empty array of source rows.");
  }

  const truthyValues = new Set(schemaMap.truthyValues.map((value) => value.toLowerCase()));

  return rowsRaw.map((row, index) => {
    if (!isPlainObject(row)) {
      throw new Error(`rows[${index}] must be an object.`);
    }

    const eventId = assertNonEmptyString(
      row[schemaMap.fieldMap.eventId],
      `rows[${index}].${schemaMap.fieldMap.eventId}`
    );
    const caseId = assertNonEmptyString(
      row[schemaMap.fieldMap.caseId],
      `rows[${index}].${schemaMap.fieldMap.caseId}`
    );
    const reportedAt = parseReportedAt(
      row[schemaMap.fieldMap.reportedAt],
      index,
      schemaMap.fieldMap.reportedAt
    );
    const linkedToEngineRecommendation = parseBooleanLike(
      row[schemaMap.fieldMap.linkedToEngineRecommendation],
      truthyValues,
      index,
      schemaMap.fieldMap.linkedToEngineRecommendation
    );

    return {
      sampleId: `m03-kpi06-ops-${String(index + 1).padStart(5, "0")}`,
      eventId,
      caseId,
      reportedAt,
      linkedToEngineRecommendation,
    };
  });
}
