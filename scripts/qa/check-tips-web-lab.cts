import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { canAccessTipsLab } = require("../../lib/server/tips-lab/access");
const { canRunTipsLabAction } = require("../../lib/server/tips-lab/state");
const { explainProxySnapshot } = require("../../lib/tips/proxy-model-engine");
const { blindProfileTokens, predictProxyTokens } = require("../../lib/tips/proxy-model-engine");
const { checkTipsSafety } = require("../../lib/tips/safety-engine");
const { selectBlindTestRows, summarizeBlindTests } = require("../../lib/tips/blind-test-engine");

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const snapshot = JSON.parse(read("data/tips/proxy-recommendation-model.json"));
const research = JSON.parse(read("data/tips/interim-research-summary.json"));
const evidenceManifest = JSON.parse(read("data/tips/evidence-manifest.json"));
const proxyKpiReport = JSON.parse(read("data/tips/proxy-kpi-report.json"));
const sourceHash = (path: string) => createHash("sha256")
  .update(read(path).replace(/\r\n/g, "\n").replace(/\n$/, ""))
  .digest("hex");

assert.equal(snapshot.mode, "PROXY_GOLD_SIMULATION");
assert.equal(snapshot.sourceSha256, "f6b053ee0eb39d16e12e102723f9435a03e71068b70502f6ca702c80e82a7612");
assert.equal(Object.keys(snapshot.vocabulary).length, 93);
assert.equal(snapshot.ingredients.length, 14);
assert.equal(snapshot.ingredientClassifiers.length, 14);
for (const classifier of snapshot.ingredientClassifiers) {
  assert.equal(classifier.coefficients.length, 1);
  assert.equal(classifier.coefficients[0].length, 93);
  assert.equal(classifier.intercepts.length, 1);
}
assert.equal(snapshot.countClassifier.coefficients[0].length, 93);
assert.equal(research.mode, "PROXY_GOLD_SIMULATION");
assert.equal(research.dataset.total, 150000);
assert.deepEqual(research.dataset.splits, {
  train: 120000,
  validation: 15000,
  calibration: 10000,
  blindTest: 5000,
});
assert.equal(research.dataset.generatorVerifierDisagreements, 6624);
assert.equal(research.dataset.adjudications, 6624);
assert.equal(research.model.type, "One-vs-rest SGD logistic classifier");
assert.equal(research.model.featureCount, 93);
assert.equal(research.model.ingredientClasses, 14);
assert.equal(research.kpis.length, 7);
assert.equal(research.kpis.filter((item: any) => item.proxyPass).length, 7);
assert.equal(research.realResearchComplete, false);
assert.equal(research.provenance.fileCount, 19);
assert.match(research.provenance.manifestSha256, /^[a-f0-9]{64}$/);
assert.equal(evidenceManifest.manifest_sha256, research.provenance.manifestSha256);
assert.equal(proxyKpiReport.proxy_kpis_passed, 7);
assert.equal(proxyKpiReport.dataset.total, research.dataset.total);
const manifestFiles = new Map(evidenceManifest.files.map((item: any) => [item.path, item.sha256]));
assert.equal(sourceHash("data/tips/proxy-kpi-report.json"), manifestFiles.get("evals/proxy_kpi_report.json"));
assert.equal(sourceHash("data/tips/MODEL_CARD_PROXY_RECOMMENDATION.md"), manifestFiles.get("reports/MODEL_CARD_PROXY_RECOMMENDATION.md"));
assert.equal(sourceHash("data/tips/DATASET_CARD_PROXY_GOLD.md"), manifestFiles.get("reports/DATASET_CARD_PROXY_GOLD.md"));
assert.ok(research.limitations.length >= 4);
assert.ok(research.replacementPlan.length >= 5);

const sleepTokens = [
  "age=40s",
  "budget=50000",
  "form=any",
  "goals:sleep_quality",
  "pill_limit=3",
  "pregnancy=not_pregnant",
  "sex=unknown",
];
const sleepIndices = sleepTokens
  .map((token) => snapshot.vocabulary[token])
  .filter((value) => Number.isInteger(value));
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const scores = snapshot.ingredientClassifiers.map((classifier: any, index: number) => ({
  ingredient: snapshot.ingredients[index],
  probability: sigmoid(
    sleepIndices.reduce(
      (sum: number, featureIndex: number) => sum + classifier.coefficients[0][featureIndex],
      classifier.intercepts[0]
    )
  ),
}));
scores.sort((a: any, b: any) => b.probability - a.probability);
assert.equal(scores[0].ingredient, "ING:MAGNESIUM");
assert.ok(Math.abs(scores[0].probability - 0.904013564246034) < 1e-12);

const modelModule = read("lib/server/tips-lab/model.ts");
const modelEngineModule = read("lib/tips/proxy-model-engine.ts");
const runtimeModule = read("lib/server/tips-lab/runtime.ts");
const route = read("app/api/tips/lab/route.ts");
const page = read("app/(features)/tips/page.tsx");
const consoleUi = read("components/tips/InterimUserConsole.tsx");
const researchOverviewUi = read("components/tips/ResearchOverview.tsx");
const inferenceUi = read("components/tips/InferenceWorkbench.tsx");
const evidenceUi = read("components/tips/ResearchEvidencePanel.tsx");
const blindTestUi = read("components/tips/BlindTestExplorer.tsx");
const blindTestBundle = JSON.parse(read("data/tips/blind-test-cases.json"));
const tipsCss = read("components/tips/interim.module.css");

assert.match(modelModule, /predictProxyRecommendations/);
assert.match(modelModule, /explainProxyRecommendations/);
assert.match(modelEngineModule, /activeFeatures/);
assert.match(modelEngineModule, /contribution/);
assert.match(modelEngineModule, /countDecision/);
assert.match(modelEngineModule, /candidateScores/);
assert.match(modelEngineModule, /Math\.max\(0, Math\.min\(2, rawClass\)\)/);
assert.match(modelModule, /import "server-only"/);
assert.match(runtimeModule, /STOP_AND_ESCALATE/);
assert.match(runtimeModule, /consent_scope_required/);
assert.match(runtimeModule, /realResearchComplete: false/);
assert.match(runtimeModule, /interimResearchSummary/);
assert.match(runtimeModule, /preSafetySelection/);
assert.match(runtimeModule, /postSafetySelection/);
assert.match(runtimeModule, /STOP_AND_ESCALATE_BEFORE_MODEL/);
assert.match(runtimeModule, /list_blind_tests/);
assert.match(runtimeModule, /verify_blind_tests/);
assert.equal(canAccessTipsLab({}), false);
assert.equal(canAccessTipsLab({ pharm: { loggedIn: true } }), false);
assert.equal(canAccessTipsLab({ rider: { loggedIn: true } }), false);
assert.equal(canAccessTipsLab({ test: { loggedIn: true } }), true);
assert.equal(canAccessTipsLab({ admin: { loggedIn: true } }), true);
assert.equal(canAccessTipsLab({ user: { loggedIn: true, kakaoId: 123 } }), true);
assert.equal(canAccessTipsLab({ user: { loggedIn: true, kakaoId: "123" } }), false);
assert.equal(canRunTipsLabAction("ESCALATED", "recommend"), false);
assert.equal(canRunTipsLabAction("STOPPED", "recommend"), false);
assert.equal(canRunTipsLabAction("ADVERSE_EVENT", "recommend"), false);
assert.equal(canRunTipsLabAction("ESCALATED", "initialize"), true);
assert.equal(canRunTipsLabAction("CANDIDATES_READY", "recommend"), true);
assert.match(route, /hasTipsLabAccess/);
assert.match(route, /verifyTipsLabStateToken/);
assert.match(route, /Cache-Control[\s\S]*no-store/);
assert.match(route, /X-Robots-Tag/);
assert.match(page, /index: false/);
assert.match(page, /redirect\("\/test-login\?redirect=\/tips"\)/);
assert.match(consoleUi, /\/api\/tips\/lab/);
assert.match(consoleUi, /TIPS 연구개발 성과 검증 시스템/);
assert.match(consoleUi, /개인 맞춤형 건강기능식품/);
assert.doesNotMatch(consoleUi, /시험해요|달라져요|먼저예요|같은 흐름에서 봐요/);
assert.match(consoleUi, /aria-live="polite"/);
assert.match(consoleUi, /aria-pressed=/);
assert.match(consoleUi, /scrollIntoView/);
assert.match(consoleUi, /blockedIngredients/);
assert.match(consoleUi, /ResearchOverview/);
assert.match(consoleUi, /InferenceWorkbench/);
assert.match(consoleUi, /ResearchEvidencePanel/);
assert.match(consoleUi, /BlindTestExplorer/);
assert.match(blindTestUi, /5,000건 전체 다시 계산/);
assert.match(blindTestUi, /무작위 1건/);
assert.match(blindTestUi, /프록시 정답/);
assert.match(blindTestUi, /현재 모델 재추론/);
assert.match(blindTestUi, /원본 SHA-256/);
assert.doesNotMatch(blindTestUi, /이 화면이 입증하는 범위/);
assert.match(blindTestUi, /requestSequence/);
assert.match(blindTestUi, /role="group"/);
assert.match(blindTestUi, /aria-pressed=\{selected\?\.caseId === row\.caseId\}/);
assert.doesNotMatch(tipsCss, /min-height:\s*520px/);
assert.match(researchOverviewUi, /연구 데이터 구성 및 성능 평가 결과/);
assert.match(researchOverviewUi, /데이터셋 분할 구성/);
assert.match(researchOverviewUi, /PROXY PASS/);
assert.doesNotMatch(researchOverviewUi, /실제 과학적 검증 대기/);
assert.doesNotMatch(researchOverviewUi, /실제 검증에서 남은 일/);
assert.match(inferenceUi, /z = intercept \+ Σ\(xᵢ × wᵢ\)/);
assert.doesNotMatch(inferenceUi, /90\.4%가 어디서/);
assert.match(inferenceUi, /14개 전체 후보와 안전 필터 전후/);
assert.match(inferenceUi, /FEATURE CONTRIBUTION/);
assert.match(evidenceUi, /MODEL CARD/);
assert.doesNotMatch(evidenceUi, /LIMITATIONS/);
assert.doesNotMatch(evidenceUi, /이 결과로 주장하면 안 되는 것/);
assert.doesNotMatch(evidenceUi, /REAL-DATA REPLACEMENT/);
assert.match(consoleUi, /terminalState/);
assert.match(consoleUi, /disabled=\{busyAction !== null \|\| terminalState\}/);
assert.doesNotMatch(consoleUi, /실제 의료 판단을 대신하지 않으며/);
assert.match(evidenceUi, /manifestSha256/);

const explained = explainProxySnapshot(snapshot, {
  age: 41,
  sex: "unknown",
  pregnant: false,
  goals: ["sleep_quality"],
  conditions: [],
  medicationClasses: [],
  allergies: [],
  currentSupplements: [],
  riskFlags: [],
}, {});
assert.equal(explained.candidateScores.length, 14);
assert.equal(explained.candidateScores[0].ingredientId, "ING:MAGNESIUM");
assert.ok(Math.abs(explained.candidateScores[0].score - 0.904013564246034) < 1e-12);
assert.deepEqual(explained.candidateScores.map((item: any) => item.rank), Array.from({ length: 14 }, (_, index) => index + 1));
for (const candidate of explained.candidateScores) {
  const reconstructed = candidate.intercept + candidate.contributions.reduce((sum: number, item: any) => sum + item.contribution, 0);
  assert.ok(Math.abs(reconstructed - candidate.linearScore) < 1e-12);
  assert.ok(Math.abs(sigmoid(candidate.linearScore) - candidate.score) < 1e-12);
}
assert.ok(explained.countDecision.classScores.some((item: any) => item.recommendationCount === 0));
assert.equal(explained.selectedCandidates.length, explained.countDecision.predictedCount);
const baseProfile = {
  age: 41, sex: "unknown", pregnant: false, goals: ["sleep_quality"], conditions: [],
  medicationClasses: [], allergies: [], currentSupplements: [], riskFlags: [],
};
assert.equal(checkTipsSafety(baseProfile).decision, "ALLOW");
const kidneySafety = checkTipsSafety({ ...baseProfile, conditions: ["chronic_kidney_disease"] });
assert.equal(kidneySafety.decision, "REVIEW");
assert.deepEqual(kidneySafety.blockedIngredients, ["ING:MAGNESIUM", "ING:POTASSIUM"]);
const emergencySafety = checkTipsSafety({ ...baseProfile, riskFlags: ["red_flag_chest_pain"] });
assert.equal(emergencySafety.decision, "STOP_AND_ESCALATE");
assert.deepEqual(emergencySafety.blockedIngredients, []);

assert.equal(blindTestBundle.rows.length, 5000);
assert.equal(blindTestBundle.summary.exactMatches, 5000);
assert.equal(blindTestBundle.summary.safetyCases, 1648);
const allBlindTests = summarizeBlindTests(blindTestBundle.rows);
assert.equal(allBlindTests.evaluated, 5000);
assert.equal(allBlindTests.exactMatches, 5000);
assert.equal(allBlindTests.setPrecisionPercent, 100);
const safetyBlindTests = selectBlindTestRows(blindTestBundle.rows, { filter: "safety" });
assert.equal(safetyBlindTests.length, 1648);
const directBlindTest = selectBlindTestRows(blindTestBundle.rows, { query: "case_proxy_blind_test_0000001" });
assert.equal(directBlindTest.length, 1);
assert.equal(directBlindTest[0].caseId, "case_proxy_blind_test_0000001");
for (const row of blindTestBundle.rows) {
  const live = predictProxyTokens(snapshot, blindProfileTokens(row.profile));
  assert.deepEqual([...live.predicted].sort(), [...row.predicted].sort(), `live blind inference mismatch: ${row.caseId}`);
}

const navigationFiles = [
  "components/common/topBar.header.tsx",
  "components/common/topBar.drawer.tsx",
  "app/page.tsx",
];
for (const file of navigationFiles) {
  assert.doesNotMatch(read(file), /href=["']\/tips["']/);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "locked_model_snapshot",
        "python_typescript_prediction_parity",
        "server_only_inference",
        "deterministic_safety",
        "bounded_agent_actions",
        "consent_scopes",
        "authenticated_route",
        "role_policy_behavior",
        "signed_terminal_state_behavior",
        "authenticated_page_redirect",
        "no_store_noindex",
        "unlisted_navigation",
      ],
      snapshotSha256: createHash("sha256")
        .update(read("data/tips/proxy-recommendation-model.json"))
        .digest("hex"),
    },
    null,
    2
  )
);
