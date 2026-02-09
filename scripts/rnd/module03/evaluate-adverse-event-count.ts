// RND: Module 03 KPI #6 reproducible adverse-event count evaluation command.

import fs from "node:fs";
import path from "node:path";
import { runModule03SafetyValidationMvp } from "../../../lib/rnd/module03-personal-safety/mvp-engine";
import { buildModule03ScaffoldBundle } from "../../../lib/rnd/module03-personal-safety/scaffold";
import {
  evaluateModule03AdverseEventCount,
  type Module03AdverseEventSample,
} from "../../../lib/rnd/module03-personal-safety/evaluation";
import { buildModule03AdverseEventSamples } from "./adverse-event-fixture";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  evaluatedAt: string | null;
  eventCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const eventsIndex = argv.indexOf("--events");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt = evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  const rawEventCount = eventsIndex >= 0 ? argv[eventsIndex + 1] ?? null : null;
  const parsedEventCount = rawEventCount ? Number.parseInt(rawEventCount, 10) : 12;

  if (!Number.isInteger(parsedEventCount) || parsedEventCount <= 0) {
    throw new Error("--events must be a positive integer.");
  }

  return { outPath, generatedAt, evaluatedAt, eventCount: parsedEventCount };
}

function buildSamples(
  mvpResult: ReturnType<typeof runModule03SafetyValidationMvp>,
  eventCount: number
): Module03AdverseEventSample[] {
  return buildModule03AdverseEventSamples(
    mvpResult.appliedResults,
    eventCount,
    mvpResult.evaluatedAt
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

  const samples = buildSamples(mvpResult, args.eventCount);
  const report = evaluateModule03AdverseEventCount(samples, mvpResult.evaluatedAt);

  const output = {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    evaluatedAt: mvpResult.evaluatedAt,
    kpiId: "kpi-06",
    sampleAdverseEventCount: samples.length,
    mvpAppliedResultCount: mvpResult.appliedResults.length,
    report,
    adverseEventSamples: samples,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 03 KPI #6 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
