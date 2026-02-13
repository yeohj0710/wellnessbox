// RND: Module 04 KPI #2 reproducible efficacy-improvement evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule04EfficacyQuantificationMvp } from "../../../lib/rnd/module04-efficacy-quantification/mvp-engine";
import { buildModule04ScaffoldBundle } from "../../../lib/rnd/module04-efficacy-quantification/scaffold";
import {
  evaluateModule04ImprovementPp,
  type Module04ImprovementSample,
} from "../../../lib/rnd/module04-efficacy-quantification/evaluation";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;

  return { outPath, generatedAt, evaluatedAt };
}

function buildSamples(
  result: ReturnType<typeof runModule04EfficacyQuantificationMvp>
): Module04ImprovementSample[] {
  return result.output.userResults.map((userResult) => ({
    sampleId: userResult.resultId,
    evaluationId: userResult.evaluationId,
    appUserIdHash: userResult.appUserIdHash,
    preZScore: userResult.preScore,
    postZScore: userResult.postScore,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule04ScaffoldBundle(args.generatedAt ?? undefined);
  const mvpResult = runModule04EfficacyQuantificationMvp({
    evaluationInputs: bundle.evaluationInputs,
    normalizationRules: bundle.normalizationRules,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
    datasetVersion: "rnd04-mvp-dataset-v1",
  });

  const samples = buildSamples(mvpResult);
  const report = evaluateModule04ImprovementPp(
    samples,
    args.evaluatedAt ?? mvpResult.generatedAt
  );

  const output = {
    module: "04_efficacy_quantification_model",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: report.evaluatedAt,
    mvpEvaluationRunId: mvpResult.output.evaluationRunId,
    includedUserCount: mvpResult.output.includedUserCount,
    excludedUserCount: mvpResult.output.excludedUserCount,
    runtimeLogCount: mvpResult.runtimeLogs.length,
    report,
    samples,
    excludedCases: mvpResult.output.excludedCases,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 04 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
