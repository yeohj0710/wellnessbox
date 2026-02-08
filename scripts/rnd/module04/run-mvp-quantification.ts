// RND: Module 04 MVP deterministic efficacy quantification command.

import { runModule04EfficacyQuantificationMvp } from "../../../lib/rnd/module04-efficacy-quantification/mvp-engine";
import { buildModule04ScaffoldBundle } from "../../../lib/rnd/module04-efficacy-quantification/scaffold";

type CliArgs = {
  generatedAt: string | null;
  evaluationRunId: string | null;
  adherenceThreshold: number | null;
  minMeasurementsPerPeriod: number | null;
  outlierZThreshold: number | null;
};

function parseNumericArg(argv: string[], flag: string): number | null {
  const index = argv.indexOf(flag);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a number.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliArgs {
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluationRunIdIndex = argv.indexOf("--evaluation-run-id");
  const generatedAt =
    generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluationRunId =
    evaluationRunIdIndex >= 0 ? argv[evaluationRunIdIndex + 1] ?? null : null;

  return {
    generatedAt,
    evaluationRunId,
    adherenceThreshold: parseNumericArg(argv, "--adherence-threshold"),
    minMeasurementsPerPeriod: parseNumericArg(
      argv,
      "--min-measurements-per-period"
    ),
    outlierZThreshold: parseNumericArg(argv, "--outlier-z-threshold"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule04ScaffoldBundle(args.generatedAt ?? undefined);
  const result = runModule04EfficacyQuantificationMvp({
    evaluationInputs: bundle.evaluationInputs,
    normalizationRules: bundle.normalizationRules,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
    evaluationRunId: args.evaluationRunId ?? undefined,
    adherenceThreshold: args.adherenceThreshold ?? undefined,
    minMeasurementsPerPeriod:
      args.minMeasurementsPerPeriod !== null
        ? Math.trunc(args.minMeasurementsPerPeriod)
        : undefined,
    outlierZThreshold: args.outlierZThreshold ?? undefined,
    datasetVersion: "rnd04-mvp-dataset-v1",
  });

  const output = {
    module: result.module,
    phase: result.phase,
    generatedAt: result.generatedAt,
    input: {
      evaluationCount: bundle.evaluationInputs.length,
      normalizationRuleCount: bundle.normalizationRules.length,
    },
    output: {
      evaluationRunId: result.output.evaluationRunId,
      includedUserCount: result.output.includedUserCount,
      excludedUserCount: result.output.excludedUserCount,
      averageImprovementPp: result.output.averageImprovementPp,
      runtimeLogCount: result.runtimeLogs.length,
    },
    quantificationOutput: result.output,
    runtimeLogs: result.runtimeLogs,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
