import fs from "node:fs";
import path from "node:path";
import { hasFlag } from "./cli-helpers";
import {
  assertNonEmptyString,
  getArgValue,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import {
  DEFAULT_EXPECTED_ENVIRONMENT,
  DEFAULT_OUT_FILENAME,
  type CliArgs,
} from "./validate-scheduler-production-readiness-types";

export function parseArgs(argv: string[]): CliArgs {
  const summaryPathValue = getArgValue(argv, "--summary");
  if (!summaryPathValue) {
    throw new Error("--summary is required.");
  }
  const summaryPath = path.resolve(summaryPathValue);
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`--summary file does not exist: ${summaryPath}`);
  }

  const outPath = path.resolve(
    getArgValue(argv, "--out") ?? path.join(path.dirname(summaryPath), DEFAULT_OUT_FILENAME)
  );
  const expectedEnvironment = assertNonEmptyString(
    getArgValue(argv, "--expected-environment") ?? DEFAULT_EXPECTED_ENVIRONMENT,
    "--expected-environment"
  );

  return {
    summaryPath,
    outPath,
    expectedEnvironment,
    requireProvidedInput: hasFlag(argv, "--require-provided-input"),
    allowRndDefaultSecretRefs: hasFlag(argv, "--allow-rnd-default-secret-ref"),
  };
}
