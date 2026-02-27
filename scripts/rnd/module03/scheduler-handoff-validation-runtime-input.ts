import path from "node:path";
import {
  readJsonFile,
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type { CliArgs } from "./scheduler-handoff-validation-cli";
import type {
  ValidationInputResolution,
  ValidationPaths,
} from "./scheduler-handoff-validation-runtime-types";

type OpsAdverseEventRow = {
  event_id: string;
  case_id: string;
  reported_at: string;
  linked_to_engine_recommendation: "yes" | "no";
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseInputRows(raw: unknown, sourcePath: string): unknown[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Input source rows must be a non-empty JSON array: ${sourcePath}`);
  }
  return raw;
}

function buildRepresentativeSourceRows(windowEnd: string, rowCount: number): OpsAdverseEventRow[] {
  const windowEndMs = Date.parse(windowEnd);
  return Array.from({ length: rowCount }, (_, index) => {
    const ordinal = index + 1;
    const reportedAt = new Date(windowEndMs - (index * 20 + 5) * DAY_IN_MS).toISOString();
    return {
      event_id: `pv-event-${String(ordinal).padStart(4, "0")}`,
      case_id: `pv-case-${String(ordinal).padStart(4, "0")}`,
      reported_at: reportedAt,
      linked_to_engine_recommendation: ordinal <= 4 ? "yes" : "no",
    };
  });
}

export function buildValidationPaths(outDir: string): ValidationPaths {
  return {
    archiveDir: path.join(outDir, "archive"),
    handoffDir: path.join(outDir, "handoff"),
    failureAlertDir: path.join(outDir, "failure-alerts"),
    bundlePath: path.join(outDir, "scheduler-deployment-bundle.json"),
    infraBindingPath: path.join(outDir, "scheduler-infra-binding.json"),
    dryRunReportPath: path.join(outDir, "scheduler-dry-run-report.json"),
    summaryPath: path.join(outDir, "scheduler-handoff-validation.json"),
    generatedInputPath: path.join(outDir, "representative-export-window.json"),
  };
}

export function resolveValidationInput(
  args: CliArgs,
  generatedInputPath: string
): ValidationInputResolution {
  const inputRows = args.inputPath
    ? parseInputRows(readJsonFile(args.inputPath), args.inputPath)
    : buildRepresentativeSourceRows(args.windowEnd, args.sampleRowCount);
  const resolvedInputPath = args.inputPath ?? generatedInputPath;

  if (!args.inputPath) {
    writeJsonFile(generatedInputPath, inputRows);
  }

  return { inputRows, resolvedInputPath };
}
