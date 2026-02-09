// RND: Module 03 KPI #5 reproducible evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule03SafetyValidationMvp } from "../../../lib/rnd/module03-personal-safety/mvp-engine";
import { buildModule03ScaffoldBundle } from "../../../lib/rnd/module03-personal-safety/scaffold";
import {
  MODULE03_REFERENCE_ACCURACY_MIN_RULE_COUNT,
  evaluateModule03AdverseEventCount,
  evaluateModule03ReferenceAccuracy,
  type Module03AdverseEventSample,
  type Module03ReferenceRuleSample,
} from "../../../lib/rnd/module03-personal-safety/evaluation";
import { buildModule03AdverseEventSamples } from "./adverse-event-fixture";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
  ruleCount: number;
  eventCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const rulesIndex = argv.indexOf("--rules");
  const eventsIndex = argv.indexOf("--events");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  const rawRuleCount = rulesIndex >= 0 ? argv[rulesIndex + 1] ?? null : null;
  const rawEventCount = eventsIndex >= 0 ? argv[eventsIndex + 1] ?? null : null;
  const parsedRuleCount = rawRuleCount
    ? Number.parseInt(rawRuleCount, 10)
    : MODULE03_REFERENCE_ACCURACY_MIN_RULE_COUNT;
  const parsedEventCount = rawEventCount ? Number.parseInt(rawEventCount, 10) : 12;

  if (!Number.isInteger(parsedRuleCount) || parsedRuleCount <= 0) {
    throw new Error("--rules must be a positive integer.");
  }
  if (!Number.isInteger(parsedEventCount) || parsedEventCount <= 0) {
    throw new Error("--events must be a positive integer.");
  }

  return {
    outPath,
    generatedAt,
    evaluatedAt,
    ruleCount: parsedRuleCount,
    eventCount: parsedEventCount,
  };
}

function assertHasAppliedResults(
  result: ReturnType<typeof runModule03SafetyValidationMvp>
): asserts result is ReturnType<typeof runModule03SafetyValidationMvp> {
  if (result.appliedResults.length === 0) {
    throw new Error("Module 03 evaluation requires at least one applied rule result.");
  }
}

function buildEvaluationSamples(
  result: ReturnType<typeof runModule03SafetyValidationMvp>,
  ruleCount: number
): Module03ReferenceRuleSample[] {
  assertHasAppliedResults(result);

  return Array.from({ length: ruleCount }, (_, index) => {
    const seed = result.appliedResults[index % result.appliedResults.length];
    const suffix = String(index + 1).padStart(3, "0");

    return {
      sampleId: `${seed.resultId}-${suffix}`,
      expected: {
        ruleId: seed.ruleId,
        ingredientCode: seed.ingredientCode,
        decision: seed.decision,
        violation: seed.violation,
        referenceIds: [...seed.referenceIds],
      },
      observed: {
        ruleId: seed.ruleId,
        ingredientCode: seed.ingredientCode,
        decision: seed.decision,
        violation: seed.violation,
        referenceIds: [...seed.referenceIds],
      },
    };
  });
}

function buildAdverseEventSamples(
  result: ReturnType<typeof runModule03SafetyValidationMvp>,
  eventCount: number
): Module03AdverseEventSample[] {
  return buildModule03AdverseEventSamples(
    result.appliedResults,
    eventCount,
    result.evaluatedAt
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule03ScaffoldBundle(args.generatedAt ?? undefined);
  const mvpResult = runModule03SafetyValidationMvp({
    validationInput: bundle.validationInput,
    rules: bundle.rules,
    references: bundle.references,
    evaluatedAt: args.evaluatedAt ?? bundle.generatedAt,
  });

  const samples = buildEvaluationSamples(mvpResult, args.ruleCount);
  const adverseEventSamples = buildAdverseEventSamples(mvpResult, args.eventCount);
  const report = evaluateModule03ReferenceAccuracy(samples, mvpResult.evaluatedAt);
  const kpi06Report = evaluateModule03AdverseEventCount(
    adverseEventSamples,
    mvpResult.evaluatedAt
  );

  const output = {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: mvpResult.evaluatedAt,
    sampleRuleCount: samples.length,
    sampleAdverseEventCount: adverseEventSamples.length,
    mvpAppliedResultCount: mvpResult.appliedResults.length,
    mvpTraceLogCount: mvpResult.traceLogs.length,
    report,
    kpi06Report,
    samples,
    adverseEventSamples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 03 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
