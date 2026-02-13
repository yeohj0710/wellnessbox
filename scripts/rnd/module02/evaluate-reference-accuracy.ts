// RND: Module 02 KPI #5 reproducible evaluation command.

import fs from "node:fs";
import path from "node:path";
import { buildModule02ScaffoldBundle } from "../../../lib/rnd/module02-data-lake/scaffold";
import {
  MODULE02_REFERENCE_ACCURACY_MIN_RULE_COUNT,
  evaluateModule02ReferenceAccuracy,
  type Module02ReferenceRuleSample,
} from "../../../lib/rnd/module02-data-lake/evaluation";

type CliArgs = {
  outPath: string | null;
  generatedAt: string | null;
  ruleCount: number;
};

function parseArgs(argv: string[]): CliArgs {
  const outIndex = argv.indexOf("--out");
  const generatedAtIndex = argv.indexOf("--generated-at");
  const rulesIndex = argv.indexOf("--rules");

  const outPath = outIndex >= 0 ? argv[outIndex + 1] ?? null : null;
  const generatedAt = generatedAtIndex >= 0 ? argv[generatedAtIndex + 1] ?? null : null;
  const rawRuleCount = rulesIndex >= 0 ? argv[rulesIndex + 1] ?? null : null;
  const parsedRuleCount = rawRuleCount
    ? Number.parseInt(rawRuleCount, 10)
    : MODULE02_REFERENCE_ACCURACY_MIN_RULE_COUNT;

  if (!Number.isInteger(parsedRuleCount) || parsedRuleCount <= 0) {
    throw new Error("--rules must be a positive integer.");
  }

  return { outPath, generatedAt, ruleCount: parsedRuleCount };
}

function extractDecisionLogicId(
  bundle: ReturnType<typeof buildModule02ScaffoldBundle>
): string {
  const decisionRecord = bundle.records.find((record) => {
    return (
      record.sourceKind === "internal_compute_result" &&
      typeof record.payload.decision === "string" &&
      record.payload.decision.trim().length > 0
    );
  });

  if (!decisionRecord || typeof decisionRecord.payload.decision !== "string") {
    throw new Error("Module 02 evaluation requires an internal compute decision payload.");
  }

  return decisionRecord.payload.decision;
}

function buildEvaluationSamples(
  bundle: ReturnType<typeof buildModule02ScaffoldBundle>,
  ruleCount: number
): Module02ReferenceRuleSample[] {
  const baseLog = bundle.evidenceLinkLogs[0];
  if (!baseLog) {
    throw new Error("Module 02 evaluation requires at least one evidence-link log.");
  }

  const logicId = extractDecisionLogicId(bundle);
  const expectedReference = {
    evidenceIds: [...baseLog.linkedEvidenceIds],
    sourceKinds: [...baseLog.sourceKinds],
    lineagePath: [...baseLog.lineagePath],
  };

  return Array.from({ length: ruleCount }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    return {
      ruleId: `rule-${suffix}`,
      sampleId: `${baseLog.sampleId}-${suffix}`,
      expected: {
        logicId,
        reference: {
          evidenceIds: [...expectedReference.evidenceIds],
          sourceKinds: [...expectedReference.sourceKinds],
          lineagePath: [...expectedReference.lineagePath],
        },
      },
      observed: {
        logicId,
        reference: {
          evidenceIds: [...expectedReference.evidenceIds],
          sourceKinds: [...expectedReference.sourceKinds],
          lineagePath: [...expectedReference.lineagePath],
        },
      },
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = buildModule02ScaffoldBundle(args.generatedAt ?? undefined);
  const samples = buildEvaluationSamples(bundle, args.ruleCount);
  const report = evaluateModule02ReferenceAccuracy(samples);

  const output = {
    module: "02_data_lake",
    phase: "EVALUATION",
    generatedAt: bundle.generatedAt,
    recordCount: bundle.records.length,
    evidenceLinkLogCount: bundle.evidenceLinkLogs.length,
    sampleRuleCount: samples.length,
    samples,
    report,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.outPath) {
    const absolutePath = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, serialized, "utf8");
    console.log(`Wrote Module 02 evaluation report: ${absolutePath}`);
    return;
  }

  process.stdout.write(serialized);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
