// RND: Module 03 KPI #6 ops-facing ingestion adapter evaluation command.

import fs from "node:fs";
import path from "node:path";
import {
  evaluateModule03AdverseEventCount,
  type Module03AdverseEventSample,
} from "../../../lib/rnd/module03-personal-safety/evaluation";
import {
  assertNonEmptyString,
  getArgValue,
  isPlainObject,
  readJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";

type Module03Kpi06OpsSchemaMap = {
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

type CliArgs = {
  inputPath: string;
  schemaMapPath: string | null;
  outPath: string | null;
  evaluatedAt: string | null;
};

const DEFAULT_SCHEMA_MAP_PATH = path.resolve(
  __dirname,
  "schema",
  "kpi06_pharmacovigilance_schema_map.json"
);
const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  __dirname,
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);
const FALSY_VALUES = new Set(["false", "f", "0", "no", "n", "unlinked"]);

function parseArgs(argv: string[]): CliArgs {
  const inputPathValue = getArgValue(argv, "--input");
  const schemaMapPathValue = getArgValue(argv, "--schema-map");
  const outPathValue = getArgValue(argv, "--out");
  const evaluatedAt = getArgValue(argv, "--evaluated-at");

  if (!inputPathValue) {
    throw new Error("--input is required and must point to a JSON array export.");
  }
  const inputPath = path.resolve(inputPathValue);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  if (evaluatedAt) {
    const parsed = Date.parse(evaluatedAt);
    if (!Number.isFinite(parsed)) {
      throw new Error("--evaluated-at must be a valid ISO datetime.");
    }
  }

  return {
    inputPath,
    schemaMapPath: schemaMapPathValue ? path.resolve(schemaMapPathValue) : null,
    outPath: outPathValue ? path.resolve(outPathValue) : null,
    evaluatedAt,
  };
}

function parseSchemaMap(raw: unknown, schemaMapPath: string): Module03Kpi06OpsSchemaMap {
  if (!isPlainObject(raw)) {
    throw new Error(`Schema map at ${schemaMapPath} must be a JSON object.`);
  }

  const moduleId = assertNonEmptyString(raw.module, "schemaMap.module");
  const kpiId = assertNonEmptyString(raw.kpiId, "schemaMap.kpiId");
  if (moduleId !== "03_personal_safety_validation_engine") {
    throw new Error(
      `schemaMap.module must be "03_personal_safety_validation_engine", received "${moduleId}".`
    );
  }
  if (kpiId !== "kpi-06") {
    throw new Error(`schemaMap.kpiId must be "kpi-06", received "${kpiId}".`);
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
    module: "03_personal_safety_validation_engine",
    kpiId: "kpi-06",
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

function toSamples(
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const schemaMapPath = path.resolve(args.schemaMapPath ?? DEFAULT_SCHEMA_MAP_PATH);
  const schemaMapRaw = readJsonFile(schemaMapPath);
  const schemaMap = parseSchemaMap(schemaMapRaw, schemaMapPath);
  const rowsRaw = readJsonFile(args.inputPath);
  const samples = toSamples(rowsRaw, schemaMap);
  const evaluatedAt = args.evaluatedAt ?? new Date().toISOString();
  const report = evaluateModule03AdverseEventCount(samples, evaluatedAt);

  const output = {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    generatedAt: new Date().toISOString(),
    evaluatedAt: report.evaluatedAt,
    kpiId: "kpi-06",
    adapter: {
      schemaMapPath,
      sqlTemplatePath: DEFAULT_SQL_TEMPLATE_PATH,
      sourceSystem: schemaMap.source.system,
      sourceTable: schemaMap.source.table,
      sourceTimezone: schemaMap.source.timezone,
      sourceLookbackMonths: schemaMap.source.lookbackMonths,
      mappedFields: schemaMap.fieldMap,
    },
    sourceRowCount: samples.length,
    report,
    adverseEventSamples: samples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 03 KPI #6 ops evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
