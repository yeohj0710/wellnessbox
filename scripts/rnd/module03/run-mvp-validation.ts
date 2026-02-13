// RND: Module 03 MVP deterministic safety validation command.

import { runModule03SafetyValidationMvp } from "../../../lib/rnd/module03-personal-safety/mvp-engine";
import { buildModule03ScaffoldBundle } from "../../../lib/rnd/module03-personal-safety/scaffold";

type CliArgs = {
  generatedAt: string | null;
  evaluatedAt: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const generatedAtIndex = argv.indexOf("--generated-at");
  const evaluatedAtIndex = argv.indexOf("--evaluated-at");
  const generatedAt =
    generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const evaluatedAt =
    evaluatedAtIndex >= 0 ? argv[evaluatedAtIndex + 1] ?? null : null;
  return { generatedAt, evaluatedAt };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule03ScaffoldBundle(args.generatedAt ?? undefined);
  const result = runModule03SafetyValidationMvp({
    validationInput: bundle.validationInput,
    rules: bundle.rules,
    references: bundle.references,
    evaluatedAt: args.evaluatedAt ?? bundle.generatedAt,
  });

  const output = {
    module: result.module,
    phase: result.phase,
    generatedAt: bundle.generatedAt,
    evaluatedAt: result.evaluatedAt,
    input: {
      caseId: bundle.validationInput.caseId,
      candidateCount: bundle.validationInput.candidates.length,
      ruleCount: bundle.rules.length,
      referenceCount: bundle.references.length,
    },
    output: {
      appliedResultCount: result.appliedResults.length,
      violationCount: result.appliedResults.filter((item) => item.violation).length,
      prohibitedIngredientCount: result.safetyOutput.prohibitedIngredients.length,
      traceLogCount: result.traceLogs.length,
      runtimeLogCount: result.runtimeLogs.length,
    },
    appliedResults: result.appliedResults,
    safetyOutput: result.safetyOutput,
    traceLogs: result.traceLogs,
    runtimeLogs: result.runtimeLogs,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
