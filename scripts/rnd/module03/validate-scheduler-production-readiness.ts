// RND: Module 03 KPI #6 scheduler production-readiness validator.

import {
  writeJsonFile,
} from "./orchestrate-adverse-event-evaluation-monthly-helpers";
import { buildReadinessReport, handleReadinessExit } from "./validate-scheduler-production-readiness-artifacts";
import { parseArgs } from "./validate-scheduler-production-readiness-cli";
import { computeReadinessChecks, loadReadinessSource } from "./validate-scheduler-production-readiness-runtime";

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const source = loadReadinessSource(args);
  const computation = computeReadinessChecks(args, source);
  const report = buildReadinessReport(args, source, computation);
  writeJsonFile(args.outPath, report);
  handleReadinessExit(args, computation);
}

main();
