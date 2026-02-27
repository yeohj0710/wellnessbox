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
import {
  getArgValues,
  hasFlag,
  parseKeyValuePair,
  parsePositiveInteger,
} from "./cli-helpers";
import type { CliArgs } from "./scheduler-production-gate-types";

const DEFAULT_ENVIRONMENT = "production-like";
const DEFAULT_OUT_DIR_ROOT = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-production-gate"
);

function parseRequiredEnvKeysCsv(value: string): string {
  return parseRequiredEnvKeysOrThrow(value, "--require-env").join(",");
}

function parseInputPath(argv: string[]): string | null {
  const inputPathValue = getArgValue(argv, "--input");
  const inputPath = inputPathValue ? path.resolve(inputPathValue) : null;
  if (inputPath && !fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }
  return inputPath;
}

function parseSchedulerName(argv: string[]): string | null {
  const schedulerNameRaw = getArgValue(argv, "--scheduler-name");
  return schedulerNameRaw
    ? assertNonEmptyString(schedulerNameRaw, "--scheduler-name")
    : null;
}

function parseEnvironmentArgs(argv: string[]): {
  environment: string;
  expectedEnvironment: string;
} {
  const environment = assertNonEmptyString(
    getArgValue(argv, "--environment") ?? DEFAULT_ENVIRONMENT,
    "--environment"
  );
  const expectedEnvironment = assertNonEmptyString(
    getArgValue(argv, "--expected-environment") ?? environment,
    "--expected-environment"
  );
  return { environment, expectedEnvironment };
}

function parseOptionalSampleRowCount(argv: string[]): number | null {
  const sampleRowCountValue = getArgValue(argv, "--sample-row-count");
  return sampleRowCountValue
    ? parsePositiveInteger(sampleRowCountValue, "--sample-row-count")
    : null;
}

function parseValidatedKeyValuePairs(argv: string[], flag: string): string[] {
  const pairs = getArgValues(argv, flag);
  for (const pair of pairs) {
    parseKeyValuePair(pair, flag);
  }
  return pairs;
}

export function parseArgs(argv: string[]): CliArgs {
  const windowEnd = normalizeIsoDate(
    getArgValue(argv, "--window-end") ?? new Date().toISOString(),
    "--window-end"
  );
  const defaultOutDir = path.join(
    DEFAULT_OUT_DIR_ROOT,
    toMonthToken(windowEnd),
    `run-${toPathSafeTimestamp(new Date().toISOString())}`
  );
  const outDir = path.resolve(getArgValue(argv, "--out-dir") ?? defaultOutDir);

  const inputPath = parseInputPath(argv);
  const requireProvidedInput = hasFlag(argv, "--require-provided-input");
  if (requireProvidedInput && !inputPath) {
    throw new Error(
      "--require-provided-input was set but --input is missing. Provide an exported production window JSON file."
    );
  }

  const requiredEnvRaw = getArgValue(argv, "--require-env");
  const requiredEnvKeysCsv = requiredEnvRaw ? parseRequiredEnvKeysCsv(requiredEnvRaw) : null;
  const schedulerName = parseSchedulerName(argv);
  const { environment, expectedEnvironment } = parseEnvironmentArgs(argv);
  const sampleRowCount = parseOptionalSampleRowCount(argv);
  const secretBindingPairs = parseValidatedKeyValuePairs(argv, "--secret-binding");
  const envValuePairs = parseValidatedKeyValuePairs(argv, "--env-value");

  return {
    outDir,
    windowEnd,
    inputPath,
    requireProvidedInput,
    requiredEnvKeysCsv,
    schedulerName,
    environment,
    expectedEnvironment,
    strictEnv: !hasFlag(argv, "--no-strict-env"),
    sampleRowCount,
    secretBindingPairs,
    envValuePairs,
    allowRndDefaultSecretRefs: hasFlag(argv, "--allow-rnd-default-secret-ref"),
  };
}
