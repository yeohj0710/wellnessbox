import fs from "node:fs";
import path from "node:path";
import {
  assertNonEmptyString,
  getArgValue,
  normalizeIsoDate,
  parseRequiredEnvKeys as parseRequiredEnvKeysOrThrow,
  toMonthToken,
  toPathSafeTimestamp,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { getArgValues, hasFlag, parsePositiveInteger } from "./cli-helpers";

export type CliArgs = {
  outDir: string;
  windowEnd: string;
  inputPath: string | null;
  requiredEnvKeys: string[];
  schedulerName: string;
  environment: string;
  strictEnv: boolean;
  sampleRowCount: number;
  secretBindingPairs: string[];
  envValuePairs: string[];
};

const DEFAULT_REQUIRED_ENV_KEYS = ["RND_MODULE03_WAREHOUSE_EXPORT_TOKEN"];
const DEFAULT_SCHEDULER_NAME = "module03-kpi06-adverse-event-monthly";
const DEFAULT_ENVIRONMENT = "production-like";
const DEFAULT_SAMPLE_ROW_COUNT = 12;
const DEFAULT_OUT_DIR_ROOT = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-handoff-validation"
);

function parseRequiredEnvKeys(value: string | null): string[] {
  if (!value) {
    return [...DEFAULT_REQUIRED_ENV_KEYS];
  }
  return parseRequiredEnvKeysOrThrow(value, "--require-env");
}

function parseWindowEndArg(argv: string[]): string {
  return normalizeIsoDate(
    getArgValue(argv, "--window-end") ?? new Date().toISOString(),
    "--window-end"
  );
}

function parseOutDirArg(argv: string[], windowEnd: string): string {
  const defaultOutDir = path.join(
    DEFAULT_OUT_DIR_ROOT,
    toMonthToken(windowEnd),
    `run-${toPathSafeTimestamp(new Date().toISOString())}`
  );
  return path.resolve(getArgValue(argv, "--out-dir") ?? defaultOutDir);
}

function parseInputPathArg(argv: string[]): string | null {
  const inputPathValue = getArgValue(argv, "--input");
  const inputPath = inputPathValue ? path.resolve(inputPathValue) : null;
  if (inputPath && !fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }
  return inputPath;
}

function parseSampleRowCountArg(argv: string[]): number {
  return parsePositiveInteger(
    getArgValue(argv, "--sample-row-count") ?? String(DEFAULT_SAMPLE_ROW_COUNT),
    "--sample-row-count"
  );
}

function parseSchedulerNameArg(argv: string[]): string {
  return assertNonEmptyString(
    getArgValue(argv, "--scheduler-name") ?? DEFAULT_SCHEDULER_NAME,
    "--scheduler-name"
  );
}

function parseEnvironmentArg(argv: string[]): string {
  return assertNonEmptyString(
    getArgValue(argv, "--environment") ?? DEFAULT_ENVIRONMENT,
    "--environment"
  );
}

export function parseArgs(argv: string[]): CliArgs {
  const windowEnd = parseWindowEndArg(argv);
  const outDir = parseOutDirArg(argv, windowEnd);
  const inputPath = parseInputPathArg(argv);
  const sampleRowCount = parseSampleRowCountArg(argv);
  const schedulerName = parseSchedulerNameArg(argv);
  const environment = parseEnvironmentArg(argv);

  return {
    outDir,
    windowEnd,
    inputPath,
    requiredEnvKeys: parseRequiredEnvKeys(getArgValue(argv, "--require-env")),
    schedulerName,
    environment,
    strictEnv: !hasFlag(argv, "--no-strict-env"),
    sampleRowCount,
    secretBindingPairs: getArgValues(argv, "--secret-binding"),
    envValuePairs: getArgValues(argv, "--env-value"),
  };
}
