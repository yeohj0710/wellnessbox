import fs from "node:fs";
import path from "node:path";
import {
  toMonthToken,
  toPathSafeTimestamp,
  toWorkspacePath,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import type {
  DryRunOutputVerification,
  Module03SchedulerInfraBindingArtifact,
} from "./scheduler-dry-run-types";
import { resolveArtifactPath } from "./scheduler-dry-run-infra";

const DEFAULT_DRY_RUN_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "rnd",
  "module03",
  "kpi06-scheduler-dry-run"
);

export function verifyExpectedOutputs(
  infraBinding: Module03SchedulerInfraBindingArtifact
): DryRunOutputVerification[] {
  return infraBinding.verification.expectedOutputs.map((outputPath) => {
    const absolutePath = resolveArtifactPath(outputPath);
    return {
      path: toWorkspacePath(absolutePath),
      exists: fs.existsSync(absolutePath),
    };
  });
}

export function buildDefaultOutPath(windowEnd: string): string {
  const generatedAt = new Date().toISOString();
  return path.join(
    DEFAULT_DRY_RUN_DIR,
    toMonthToken(windowEnd),
    `kpi06-scheduler-dry-run-${toPathSafeTimestamp(generatedAt)}.json`
  );
}
