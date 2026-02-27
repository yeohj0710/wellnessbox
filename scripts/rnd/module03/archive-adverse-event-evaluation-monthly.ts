// RND: Module 03 KPI #6 monthly archival runner for ops-ingestion evaluation.

import fs from "node:fs";
import { parseArgs } from "./archive-adverse-event-evaluation-monthly-cli";
import { logArchiveResults, runOpsEvaluation } from "./archive-adverse-event-evaluation-monthly-runtime";
import {
  buildArchiveEntry,
  buildArchiveExecutionPaths,
  buildNextManifest,
  readArchiveManifest,
  readOpsOutput,
  writeArchiveOutputs,
} from "./monthly-archive-artifacts";

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const paths = buildArchiveExecutionPaths(args.archiveDir, args.windowEnd);
  fs.mkdirSync(paths.monthArchiveDir, { recursive: true });

  runOpsEvaluation(args, paths.reportPath);
  const output = readOpsOutput(paths.reportPath);

  const archivedAt = new Date().toISOString();
  const entry = buildArchiveEntry(
    output,
    {
      inputPath: args.inputPath,
      schemaMapPath: args.schemaMapPath,
      archiveDir: args.archiveDir,
    },
    archivedAt,
    paths.reportPath
  );

  const manifest = readArchiveManifest(paths.manifestPath, args.archiveDir);
  const { retentionResult, nextManifest } = buildNextManifest(
    manifest,
    {
      archiveDir: args.archiveDir,
      retentionMonths: args.retentionMonths,
    },
    entry,
    archivedAt
  );

  writeArchiveOutputs(paths, nextManifest, entry, archivedAt);
  logArchiveResults(
    args.retentionMonths,
    paths.reportPath,
    paths.manifestPath,
    retentionResult
  );
}

main();
