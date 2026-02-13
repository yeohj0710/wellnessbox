// RND: Module 05 KPI #1 reproducible recommendation-accuracy evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule05OptimizationMvp } from "../../../lib/rnd/module05-optimization/mvp-engine";
import { buildModule05ScaffoldBundle } from "../../../lib/rnd/module05-optimization/scaffold";
import {
  MODULE05_RECOMMENDATION_ACCURACY_MIN_CASE_COUNT,
  evaluateModule05RecommendationAccuracy,
  type Module05RecommendationAccuracySample,
} from "../../../lib/rnd/module05-optimization/evaluation";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
  caseCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const casesIndex = argv.indexOf("--cases");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  const rawCaseCount = casesIndex >= 0 ? argv[casesIndex + 1] ?? null : null;
  const parsedCaseCount = rawCaseCount
    ? Number.parseInt(rawCaseCount, 10)
    : MODULE05_RECOMMENDATION_ACCURACY_MIN_CASE_COUNT;

  if (!Number.isInteger(parsedCaseCount) || parsedCaseCount <= 0) {
    throw new Error("--cases must be a positive integer.");
  }

  return { outPath, generatedAt, evaluatedAt, caseCount: parsedCaseCount };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildIngredientUnion(
  recommendations: Array<{ ingredientCodes: string[] }>
): string[] {
  return uniqueSorted(
    recommendations
      .flatMap((recommendation) => recommendation.ingredientCodes)
      .map((ingredientCode) => ingredientCode.trim().toLowerCase())
      .filter((ingredientCode) => ingredientCode.length > 0)
  );
}

function assertHasRecommendations(
  recommendations: Array<{ rank: number; comboId: string; itemIds: string[] }>
): asserts recommendations is Array<{ rank: number; comboId: string; itemIds: string[] }> {
  if (recommendations.length === 0) {
    throw new Error("Module 05 evaluation requires at least one recommendation.");
  }
}

function buildEvaluationSamples(
  bundle: ReturnType<typeof buildModule05ScaffoldBundle>,
  mvpResult: ReturnType<typeof runModule05OptimizationMvp>,
  caseCount: number
): Module05RecommendationAccuracySample[] {
  const expectedIngredientCodes = buildIngredientUnion(
    bundle.optimizationOutput.recommendations
  );
  const observedIngredientCodes = buildIngredientUnion(
    mvpResult.output.recommendations
  );

  const rankedRecommendations = [...mvpResult.output.recommendations].sort(
    (left, right) => left.rank - right.rank
  );
  assertHasRecommendations(rankedRecommendations);
  const topRecommendation = rankedRecommendations[0];

  return Array.from({ length: caseCount }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    return {
      sampleId: `m05-eval-sample-${suffix}`,
      caseId: `${bundle.optimizationInput.caseId}-${suffix}`,
      expectedIngredientCodes: [...expectedIngredientCodes],
      observedIngredientCodes: [...observedIngredientCodes],
      topRecommendation: {
        comboId: topRecommendation.comboId,
        itemIds: [...topRecommendation.itemIds],
      },
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule05ScaffoldBundle(args.generatedAt ?? undefined);
  const mvpResult = runModule05OptimizationMvp({
    optimizationInput: bundle.optimizationInput,
    generatedAt: args.generatedAt ?? bundle.generatedAt,
  });

  const samples = buildEvaluationSamples(bundle, mvpResult, args.caseCount);
  const report = evaluateModule05RecommendationAccuracy(
    samples,
    args.evaluatedAt ?? mvpResult.generatedAt
  );

  const output = {
    module: "05_optimization_engine",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: report.evaluatedAt,
    mvpRecommendationCount: mvpResult.output.recommendations.length,
    mvpTraceLogCount: mvpResult.traceLogs.length,
    mvpRuntimeLogCount: mvpResult.runtimeLogs.length,
    sampleCaseCount: samples.length,
    report,
    samples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 05 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
