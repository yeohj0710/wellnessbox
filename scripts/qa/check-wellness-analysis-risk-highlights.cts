import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ANALYSIS_PATH = path.resolve(ROOT_DIR, "lib/wellness/analysis.ts");
const HIGHLIGHTS_PATH = path.resolve(
  ROOT_DIR,
  "lib/wellness/analysis-risk-highlights.ts"
);

function run() {
  const analysisSource = fs.readFileSync(ANALYSIS_PATH, "utf8");
  const highlightsSource = fs.readFileSync(HIGHLIGHTS_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    analysisSource,
    /from "@\/lib\/wellness\/analysis-risk-highlights"/,
    "analysis.ts must import extracted risk highlight helpers."
  );
  checks.push("analysis_imports_risk_highlight_helpers");

  for (const token of [
    "function clampPercent(",
    "type RiskCandidate = {",
    "function sortRiskCandidates(",
    "function pickRepresentativeRiskCandidate(",
    "function normalizeRiskIdentityText(",
    "function getRiskCandidateIdentity(",
    "function toHighlight(",
  ]) {
    assert.ok(
      !analysisSource.includes(token),
      `[qa:wellness:analysis-risk-highlights] analysis.ts should not keep extracted helper: ${token}`
    );
  }
  checks.push("analysis_no_longer_keeps_inline_risk_highlight_helpers");

  for (const token of [
    "export type RiskCandidate = {",
    "export function clampWellnessPercent(",
    "export function sortRiskCandidates(",
    "export function pickRepresentativeRiskCandidate(",
    "export function getRiskCandidateIdentity(",
    "export function toWellnessHighlight(",
  ]) {
    assert.ok(
      highlightsSource.includes(token),
      `[qa:wellness:analysis-risk-highlights] highlight helper module missing token: ${token}`
    );
  }
  checks.push("highlight_helper_module_owns_risk_candidate_rules");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
