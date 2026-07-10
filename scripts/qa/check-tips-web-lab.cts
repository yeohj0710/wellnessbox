import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { canAccessTipsLab } = require("../../lib/server/tips-lab/access");
const { canRunTipsLabAction } = require("../../lib/server/tips-lab/state");

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const snapshot = JSON.parse(read("data/tips/proxy-recommendation-model.json"));

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
const runtimeModule = read("lib/server/tips-lab/runtime.ts");
const route = read("app/api/tips/lab/route.ts");
const page = read("app/(features)/tips/page.tsx");
const consoleUi = read("components/tips/InterimUserConsole.tsx");

assert.match(modelModule, /predictProxyRecommendations/);
assert.match(modelModule, /import "server-only"/);
assert.match(runtimeModule, /STOP_AND_ESCALATE/);
assert.match(runtimeModule, /consent_scope_required/);
assert.match(runtimeModule, /realResearchComplete: false/);
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
assert.match(consoleUi, /별도 Python 서버 없이/);
assert.match(consoleUi, /aria-live="polite"/);
assert.match(consoleUi, /aria-pressed=/);
assert.match(consoleUi, /scrollIntoView/);
assert.match(consoleUi, /blockedIngredients/);

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
