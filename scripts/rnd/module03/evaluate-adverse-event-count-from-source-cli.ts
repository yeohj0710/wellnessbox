import fs from "node:fs";
import path from "node:path";
import { getArgValue } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { CliArgs } from "./evaluate-adverse-event-count-from-source-types";

export const DEFAULT_SCHEMA_MAP_PATH = path.resolve(
  __dirname,
  "schema",
  "kpi06_pharmacovigilance_schema_map.json"
);
export const DEFAULT_SQL_TEMPLATE_PATH = path.resolve(
  __dirname,
  "sql",
  "kpi06_adverse_events_last_12_months.sql"
);

export function parseArgs(argv: string[]): CliArgs {
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
