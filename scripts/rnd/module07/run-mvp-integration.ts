// RND: Module 07 MVP deterministic biosensor/genetic integration command.

import { runModule07IntegrationMvp } from "../../../lib/rnd/module07-biosensor-genetic-integration/mvp-engine";
import { buildModule07ScaffoldBundle } from "../../../lib/rnd/module07-biosensor-genetic-integration/scaffold";

type CliArgs = {
  generatedAt: string | null;
  runId: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const generatedAtIndex = argv.indexOf("--generated-at");
  const runIdIndex = argv.indexOf("--run-id");
  const generatedAt =
    generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const runId = runIdIndex >= 0 ? argv[runIdIndex + 1] ?? null : null;
  return { generatedAt, runId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule07ScaffoldBundle(args.generatedAt ?? undefined);

  const result = runModule07IntegrationMvp({
    sessions: bundle.sessions,
    wearableMetrics: bundle.wearableMetrics,
    cgmMetrics: bundle.cgmMetrics,
    geneticVariants: bundle.geneticVariants,
    algorithmAdjustments: bundle.algorithmAdjustments,
    dataLakeWriteLogs: bundle.dataLakeWriteLogs,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
    runId: args.runId ?? undefined,
  });

  const linkedSessionCount = new Set(
    result.wiringLogs.filter((log) => log.linked).map((log) => log.sessionId)
  ).size;

  const output = {
    module: result.module,
    phase: result.phase,
    generatedAt: result.generatedAt,
    runId: result.output.runId,
    input: {
      sessionCount: bundle.sessions.length,
      wearableMetricCount: bundle.wearableMetrics.length,
      cgmMetricCount: bundle.cgmMetrics.length,
      geneticVariantCount: bundle.geneticVariants.length,
      adjustmentCount: bundle.algorithmAdjustments.length,
      writeLogCount: bundle.dataLakeWriteLogs.length,
    },
    output: {
      sourceSummaryCount: result.output.sourceSummaries.length,
      overallIntegrationRate: result.output.overallIntegrationRate,
      linkedDataLakeRecordCount: result.output.linkedDataLakeRecordIds.length,
      normalizedRecordCount: result.normalizedRecords.length,
      linkedSessionCount,
      wiringLogCount: result.wiringLogs.length,
      runtimeLogCount: result.runtimeLogs.length,
    },
    integrationOutput: result.output,
    normalizedRecords: result.normalizedRecords,
    wiringLogs: result.wiringLogs,
    runtimeLogs: result.runtimeLogs,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
