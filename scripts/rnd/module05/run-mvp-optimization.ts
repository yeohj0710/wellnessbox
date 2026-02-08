// RND: Module 05 MVP deterministic optimization command.

import { runModule05OptimizationMvp } from "../../../lib/rnd/module05-optimization/mvp-engine";
import { buildModule05ScaffoldBundle } from "../../../lib/rnd/module05-optimization/scaffold";

type CliArgs = {
  generatedAt: string | null;
  comboSize: number | null;
  topK: number | null;
  efficacyWeight: number | null;
  riskWeight: number | null;
  costWeight: number | null;
};

function parseNumericArg(argv: string[], flag: string): number | null {
  const index = argv.indexOf(flag);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a finite number.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliArgs {
  const generatedAtIndex = argv.indexOf("--generated-at");
  const generatedAt =
    generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;

  return {
    generatedAt,
    comboSize: parseNumericArg(argv, "--combo-size"),
    topK: parseNumericArg(argv, "--top-k"),
    efficacyWeight: parseNumericArg(argv, "--efficacy-weight"),
    riskWeight: parseNumericArg(argv, "--risk-weight"),
    costWeight: parseNumericArg(argv, "--cost-weight"),
  };
}

function buildObjectiveWeights(args: CliArgs) {
  const values = [args.efficacyWeight, args.riskWeight, args.costWeight];
  const configuredCount = values.filter((value) => value !== null).length;
  if (configuredCount === 0) return undefined;
  if (configuredCount !== 3) {
    throw new Error(
      "When setting objective weights, provide --efficacy-weight, --risk-weight, and --cost-weight together."
    );
  }

  return {
    efficacy: args.efficacyWeight as number,
    risk: args.riskWeight as number,
    cost: args.costWeight as number,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule05ScaffoldBundle(args.generatedAt ?? undefined);

  const optimizationInput = {
    ...bundle.optimizationInput,
    ...(args.topK !== null ? { topK: Math.trunc(args.topK) } : {}),
  };

  const result = runModule05OptimizationMvp({
    optimizationInput,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
    comboSize: args.comboSize !== null ? Math.trunc(args.comboSize) : undefined,
    objectiveWeights: buildObjectiveWeights(args),
  });

  const output = {
    module: result.module,
    phase: result.phase,
    generatedAt: result.generatedAt,
    input: {
      caseId: optimizationInput.caseId,
      candidateCount: optimizationInput.candidates.length,
      efficacySignalCount: optimizationInput.efficacySignals.length,
      safetyConstraintCount: optimizationInput.safetyConstraints.length,
      requestedTopK: optimizationInput.topK,
    },
    output: {
      recommendationCount: result.output.recommendations.length,
      traceLogCount: result.traceLogs.length,
      runtimeLogCount: result.runtimeLogs.length,
      topComboId: result.output.recommendations[0]?.comboId ?? null,
      topScore: result.output.recommendations[0]?.score.totalScore ?? null,
    },
    optimizationOutput: result.output,
    traceLogs: result.traceLogs,
    runtimeLogs: result.runtimeLogs,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
