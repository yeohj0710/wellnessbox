// RND: Module 06 MVP deterministic closed-loop command.

import { runModule06ClosedLoopMvp } from "../../../lib/rnd/module06-closed-loop-ai/mvp-engine";
import { buildModule06ScaffoldBundle } from "../../../lib/rnd/module06-closed-loop-ai/scaffold";

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

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return roundTo((numerator / denominator) * 100, 2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule06ScaffoldBundle(args.generatedAt ?? undefined);

  const result = runModule06ClosedLoopMvp({
    loopInputs: bundle.loopInputs,
    consultationPrompts: bundle.consultationPrompts,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
    runId: args.runId ?? undefined,
  });

  const actionCorrectCount = result.output.actionEvaluationLogs.filter((item) => {
    return item.expectedActionType === item.decidedActionType && item.executionSuccess;
  }).length;
  const llmAcceptedCount = result.output.llmEvaluationLogs.filter(
    (item) => item.responseAccepted
  ).length;

  const output = {
    module: result.module,
    phase: result.phase,
    generatedAt: result.generatedAt,
    runId: result.output.runId,
    input: {
      caseCount: bundle.loopInputs.length,
      promptCount: bundle.consultationPrompts.length,
    },
    output: {
      decisionCount: result.output.decisions.length,
      executionCount: result.output.executions.length,
      consultationResponseCount: result.output.consultationResponses.length,
      actionEvaluationCount: result.output.actionEvaluationLogs.length,
      llmEvaluationCount: result.output.llmEvaluationLogs.length,
      traceLogCount: result.traceLogs.length,
      runtimeLogCount: result.runtimeLogs.length,
    },
    kpiPreview: {
      closedLoopActionAccuracyPercent: percent(
        actionCorrectCount,
        result.output.actionEvaluationLogs.length
      ),
      llmAnswerAccuracyPercent: percent(
        llmAcceptedCount,
        result.output.llmEvaluationLogs.length
      ),
    },
    closedLoopOutput: result.output,
    traceLogs: result.traceLogs,
    runtimeLogs: result.runtimeLogs,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
