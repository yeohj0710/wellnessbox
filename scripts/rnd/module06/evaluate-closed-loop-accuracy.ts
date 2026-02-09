// RND: Module 06 KPI #3/#4 reproducible closed-loop evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule06ClosedLoopMvp } from "../../../lib/rnd/module06-closed-loop-ai/mvp-engine";
import { buildModule06ScaffoldBundle } from "../../../lib/rnd/module06-closed-loop-ai/scaffold";
import {
  MODULE06_ACTION_ACCURACY_MIN_CASE_COUNT,
  MODULE06_LLM_ACCURACY_MIN_PROMPT_COUNT,
  evaluateModule06ClosedLoopAccuracy,
  type Module06ActionAccuracySample,
  type Module06LlmAccuracySample,
} from "../../../lib/rnd/module06-closed-loop-ai/evaluation";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
  caseCount: number;
  promptCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const casesIndex = argv.indexOf("--cases");
  const promptsIndex = argv.indexOf("--prompts");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  const rawCaseCount = casesIndex >= 0 ? argv[casesIndex + 1] ?? null : null;
  const rawPromptCount = promptsIndex >= 0 ? argv[promptsIndex + 1] ?? null : null;

  const parsedCaseCount = rawCaseCount
    ? Number.parseInt(rawCaseCount, 10)
    : MODULE06_ACTION_ACCURACY_MIN_CASE_COUNT;
  const parsedPromptCount = rawPromptCount
    ? Number.parseInt(rawPromptCount, 10)
    : MODULE06_LLM_ACCURACY_MIN_PROMPT_COUNT;

  if (!Number.isInteger(parsedCaseCount) || parsedCaseCount <= 0) {
    throw new Error("--cases must be a positive integer.");
  }
  if (!Number.isInteger(parsedPromptCount) || parsedPromptCount <= 0) {
    throw new Error("--prompts must be a positive integer.");
  }

  return {
    outPath,
    generatedAt,
    evaluatedAt,
    caseCount: parsedCaseCount,
    promptCount: parsedPromptCount,
  };
}

function buildActionSamples(
  mvpResult: ReturnType<typeof runModule06ClosedLoopMvp>,
  caseCount: number
): Module06ActionAccuracySample[] {
  const actionLogs = mvpResult.output.actionEvaluationLogs;
  if (actionLogs.length === 0) {
    throw new Error("Module 06 evaluation requires at least one action evaluation log.");
  }

  return Array.from({ length: caseCount }, (_, index) => {
    const seed = actionLogs[index % actionLogs.length];
    const suffix = String(index + 1).padStart(3, "0");

    return {
      sampleId: `m06-kpi03-sample-${suffix}`,
      caseId: `${seed.caseId}-${suffix}`,
      expectedActionType: seed.expectedActionType,
      decidedActionType: seed.decidedActionType,
      executionSuccess: seed.executionSuccess,
    };
  });
}

function buildLlmSamples(
  mvpResult: ReturnType<typeof runModule06ClosedLoopMvp>,
  promptCount: number
): Module06LlmAccuracySample[] {
  const llmLogs = mvpResult.output.llmEvaluationLogs;
  if (llmLogs.length === 0) {
    throw new Error("Module 06 evaluation requires at least one LLM evaluation log.");
  }

  return Array.from({ length: promptCount }, (_, index) => {
    const seed = llmLogs[index % llmLogs.length];
    const suffix = String(index + 1).padStart(3, "0");

    return {
      sampleId: `m06-kpi04-sample-${suffix}`,
      promptId: `${seed.promptId}-${suffix}`,
      expectedAnswerKey: seed.expectedAnswerKey,
      responseAccepted: seed.responseAccepted,
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule06ScaffoldBundle(args.generatedAt ?? undefined);
  const mvpResult = runModule06ClosedLoopMvp({
    loopInputs: bundle.loopInputs,
    consultationPrompts: bundle.consultationPrompts,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
  });

  const actionSamples = buildActionSamples(mvpResult, args.caseCount);
  const llmSamples = buildLlmSamples(mvpResult, args.promptCount);
  const report = evaluateModule06ClosedLoopAccuracy(
    actionSamples,
    llmSamples,
    args.evaluatedAt ?? mvpResult.generatedAt
  );

  const output = {
    module: "06_closed_loop_ai",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: report.evaluatedAt,
    mvpRunId: mvpResult.output.runId,
    mvpActionEvaluationCount: mvpResult.output.actionEvaluationLogs.length,
    mvpLlmEvaluationCount: mvpResult.output.llmEvaluationLogs.length,
    mvpTraceLogCount: mvpResult.traceLogs.length,
    mvpRuntimeLogCount: mvpResult.runtimeLogs.length,
    sampleCaseCount: actionSamples.length,
    samplePromptCount: llmSamples.length,
    report,
    actionSamples,
    llmSamples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 06 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
