import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { createGunzip } from "node:zlib";

const sourceRoot = process.env.TIPS_RESEARCH_ARTIFACT_ROOT ??
  "C:\\dev\\wellnessbox_tips_interim_simulation_package\\artifacts\\interim_proxy_research_full";
const casePath = join(sourceRoot, "datasets", "proxy_cases.blind_test.jsonl.gz");
const predictionPath = join(sourceRoot, "evals", "recommendation_predictions.proxy_blind.jsonl.gz");
const outputPath = join(process.cwd(), "data", "tips", "blind-test-cases.json");

async function readJsonlGzip(path: string) {
  const rows: any[] = [];
  const input = createReadStream(path).pipe(createGunzip());
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (line.trim()) rows.push(JSON.parse(line));
  }
  return rows;
}

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  const [cases, predictions] = await Promise.all([
    readJsonlGzip(casePath),
    readJsonlGzip(predictionPath),
  ]);
  const caseIds = cases.map((row) => row.case_id);
  const predictionIds = predictions.map((row) => row.case_id);
  const uniqueCaseIds = new Set(caseIds);
  const uniquePredictionIds = new Set(predictionIds);
  const missingPredictionIds = caseIds.filter((id) => !uniquePredictionIds.has(id));
  const orphanPredictionIds = predictionIds.filter((id) => !uniqueCaseIds.has(id));
  if (cases.length !== 5000 || predictions.length !== 5000) throw new Error(`unexpected_cardinality:cases=${cases.length}:predictions=${predictions.length}`);
  if (uniqueCaseIds.size !== cases.length) throw new Error(`duplicate_case_ids:${cases.length - uniqueCaseIds.size}`);
  if (uniquePredictionIds.size !== predictions.length) throw new Error(`duplicate_prediction_ids:${predictions.length - uniquePredictionIds.size}`);
  if (missingPredictionIds.length || orphanPredictionIds.length) throw new Error(`join_integrity:missing=${missingPredictionIds.length}:orphan=${orphanPredictionIds.length}`);
  const byCase = new Map(predictions.map((row) => [row.case_id, row]));
  const rows = cases.map((row) => {
    const prediction = byCase.get(row.case_id);
    if (!prediction) throw new Error(`missing_prediction:${row.case_id}`);
    const gold: string[] = prediction.gold_proxy;
    const predicted: string[] = prediction.predicted;
    return {
      caseId: row.case_id,
      archetypeId: row.archetype_id,
      profile: row.profile,
      gold,
      predicted,
      exactMatch: JSON.stringify([...gold].sort()) === JSON.stringify([...predicted].sort()),
      setPrecisionPercent: prediction.set_precision_percent,
      nextAction: row.proxy_gold_label.next_action,
      riskTier: row.proxy_gold_label.risk_tier,
      abstain: row.proxy_gold_label.abstain,
      avoid: row.proxy_gold_label.avoid,
      defer: row.proxy_gold_label.defer,
      evidenceIds: row.proxy_gold_label.evidence_ids,
      safetyRuleIds: row.proxy_gold_label.safety_rule_ids,
      verifierDecision: row.verifier.decision,
      verifierDisagreement: row.verifier.detected_disagreement,
      teacherSession: row.teacher_session,
      labelClass: row.label_class,
      provenance: row.provenance,
    };
  });
  const exactMatches = rows.filter((row) => row.exactMatch).length;
  const bundle = {
    schemaVersion: "2026-07-12.v1",
    generatedFrom: "immutable interim proxy research artifacts",
    sources: {
      cases: { relativePath: "datasets/proxy_cases.blind_test.jsonl.gz", sha256: sha256(casePath) },
      predictions: { relativePath: "evals/recommendation_predictions.proxy_blind.jsonl.gz", sha256: sha256(predictionPath) },
    },
    summary: {
      total: rows.length,
      exactMatches,
      mismatches: rows.length - exactMatches,
      meanSetPrecisionPercent: rows.reduce((sum, row) => sum + row.setPrecisionPercent, 0) / rows.length,
      safetyCases: rows.filter((row) => row.riskTier > 0 || row.abstain || row.safetyRuleIds.length > 0).length,
    },
    rows,
  };
  writeFileSync(outputPath, `${JSON.stringify(bundle)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, ...bundle.summary, uniqueCaseIds: uniqueCaseIds.size, uniquePredictionIds: uniquePredictionIds.size, missingPredictions: missingPredictionIds.length, orphanPredictions: orphanPredictionIds.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
