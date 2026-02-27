// RND: Module 03 KPI #6 scheduler production gate runner (handoff + readiness).

import fs from "node:fs";
import { toWorkspacePath, writeJsonFile } from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { formatCommandFailure } from "./node-script-runner";
import { buildProductionGateArtifact } from "./scheduler-production-gate-artifacts";
import { parseArgs } from "./scheduler-production-gate-cli";
import {
  assertProductionGateRunnersAvailable,
  buildProductionGatePaths,
  runHandoffValidation,
  runReadinessValidation,
} from "./scheduler-production-gate-runtime";

function main(): void {
  assertProductionGateRunnersAvailable();

  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });
  const paths = buildProductionGatePaths(args.outDir);
  const handoffResult = runHandoffValidation(args, paths);
  const { readinessResult, readinessReport } = runReadinessValidation(args, paths);
  const gateArtifact = buildProductionGateArtifact(
    args,
    paths,
    handoffResult,
    readinessResult,
    readinessReport
  );

  writeJsonFile(paths.gateArtifactPath, gateArtifact);

  if (!readinessResult.succeeded || gateArtifact.result !== "pass") {
    const details = formatCommandFailure(readinessResult);
    throw new Error(
      [
        `Wrote Module 03 KPI #6 scheduler production gate artifact (FAIL): ${toWorkspacePath(paths.gateArtifactPath)}`,
        details,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  console.log(
    `Wrote Module 03 KPI #6 scheduler production gate artifact (PASS): ${toWorkspacePath(paths.gateArtifactPath)}`
  );
}

main();
