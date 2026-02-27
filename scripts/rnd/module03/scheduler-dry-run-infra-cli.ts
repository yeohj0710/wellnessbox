import fs from "node:fs";
import path from "node:path";
import { hasFlag } from "./cli-helpers";
import { getArgValue, normalizeIsoDate } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { CliArgs } from "./scheduler-dry-run-types";

export function parseCliArgs(argv: string[]): CliArgs {
  const infraBindingPathValue = getArgValue(argv, "--infra-binding");
  if (!infraBindingPathValue) {
    throw new Error("--infra-binding is required.");
  }
  const infraBindingPath = path.resolve(infraBindingPathValue);
  if (!fs.existsSync(infraBindingPath)) {
    throw new Error(`--infra-binding file does not exist: ${infraBindingPath}`);
  }

  const inputPathValue = getArgValue(argv, "--input");
  if (!inputPathValue) {
    throw new Error("--input is required and must point to a pre-exported JSON array.");
  }
  const inputPath = path.resolve(inputPathValue);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`--input file does not exist: ${inputPath}`);
  }

  const outPathValue = getArgValue(argv, "--out");
  const windowEnd = normalizeIsoDate(
    getArgValue(argv, "--window-end") ?? new Date().toISOString(),
    "--window-end"
  );

  return {
    infraBindingPath,
    inputPath,
    outPath: outPathValue ? path.resolve(outPathValue) : null,
    windowEnd,
    strictEnv: hasFlag(argv, "--strict-env"),
  };
}
