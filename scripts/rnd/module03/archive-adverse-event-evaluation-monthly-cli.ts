import fs from "node:fs";
import path from "node:path";
import {
  getArgValue,
  normalizeIsoDate,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  DEFAULT_ARCHIVE_DIR,
  type CliArgs,
} from "./archive-adverse-event-evaluation-monthly-types";

function parseRequiredInputPathArg(value: string | null): string {
  if (!value) {
    throw new Error("--input is required and must point to a JSON export file.");
  }
  const inputPath = path.resolve(value);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }
  return inputPath;
}

function parseOptionalExistingPathArg(
  value: string | null,
  flagName: string
): string | null {
  if (!value) {
    return null;
  }
  const resolvedPath = path.resolve(value);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${flagName} file does not exist: ${resolvedPath}`);
  }
  return resolvedPath;
}

function parseRetentionMonthsArg(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--retention-months must be a positive integer.");
  }
  return parsed;
}

export function parseArgs(argv: string[]): CliArgs {
  const inputPathValue = getArgValue(argv, "--input");
  const schemaMapPathValue = getArgValue(argv, "--schema-map");
  const archiveDirValue = getArgValue(argv, "--archive-dir");
  const windowEndValue = getArgValue(argv, "--window-end") ?? new Date().toISOString();
  const retentionMonthsValue = getArgValue(argv, "--retention-months");

  return {
    inputPath: parseRequiredInputPathArg(inputPathValue),
    schemaMapPath: parseOptionalExistingPathArg(schemaMapPathValue, "--schema-map"),
    archiveDir: archiveDirValue ? path.resolve(archiveDirValue) : DEFAULT_ARCHIVE_DIR,
    windowEnd: normalizeIsoDate(windowEndValue, "--window-end"),
    retentionMonths: parseRetentionMonthsArg(retentionMonthsValue),
  };
}
