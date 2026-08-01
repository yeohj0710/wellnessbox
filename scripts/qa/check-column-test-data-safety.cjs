/* eslint-disable no-console */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const adminApi = require("./lib/column-admin-api.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

async function run() {
  assert.deepEqual(
    adminApi.buildAdminPasswordCandidates({}),
    [],
    "QA scripts must not contain a built-in admin password"
  );

  assert.doesNotThrow(() =>
    adminApi.assertQaColumnMutationTarget("http://localhost:3113", {})
  );
  assert.doesNotThrow(() =>
    adminApi.assertQaColumnMutationTarget("http://127.0.0.1:3113", {})
  );
  assert.throws(
    () => adminApi.assertQaColumnMutationTarget("https://preview.example.com", {}),
    /QA_ALLOW_REMOTE_COLUMN_MUTATIONS/
  );
  assert.throws(
    () =>
      adminApi.assertQaColumnMutationTarget("https://wellnessbox.kr", {
        QA_ALLOW_REMOTE_COLUMN_MUTATIONS: "1",
      }),
    /QA_ALLOW_PRODUCTION_COLUMN_MUTATIONS/
  );

  const deletedUrls = [];
  const fakeContext = {
    request: {
      get: async () => ({
        status: () => 200,
        json: async () => ({
          posts: [
            { id: "exact-id", title: "qa-auto-test" },
            { id: "other-id", title: "qa-auto-test-extra" },
          ],
        }),
      }),
      delete: async (url) => {
        deletedUrls.push(url);
        return { status: () => 200 };
      },
    },
  };
  const cleanupResults = await adminApi.cleanupCreatedColumnPosts(
    "http://localhost:3113",
    fakeContext,
    [{ id: null, title: "qa-auto-test" }]
  );
  assert.deepEqual(deletedUrls, [
    "http://localhost:3113/api/admin/column/posts/exact-id",
  ]);
  assert.equal(cleanupResults[0]?.status, 200);

  const routeRunner = read("scripts/qa/check-route-scroll-and-column-card.cjs");
  const routeScenario = read("scripts/qa/lib/route-scroll/scenario.cjs");
  const cdeRunner = read("scripts/qa/verify-cde-regression.cjs");
  const cdeScenario = read(
    "scripts/qa/lib/cde-regression/column-admin-scenario.cjs"
  );

  assert.match(routeRunner, /assertQaColumnMutationTarget\(BASE_URL, process\.env\)/);
  assert.match(cdeRunner, /assertQaColumnMutationTarget\(BASE_URL, process\.env\)/);
  assert.match(routeScenario, /createdPosts,/);
  assert.doesNotMatch(routeScenario, /const createdPosts = \[\]/);
  assert.match(routeScenario, /createdPosts\.push\(trackedPost\)/);
  assert.match(cdeRunner, /cleanupCreatedPosts\(BASE_URL, context, createdPosts, result\)/);
  assert.match(cdeScenario, /createdPosts\.push\(trackedPost\)/);

  // 정리에 실패한 QA 픽스처가 남아도 공개 칼럼 목록에는 절대 올라오지 않아야 한다.
  const dbSource = read("app/column/_lib/columns-db-source.ts");
  assert.match(dbSource, /export function isQaFixtureColumn\(/);
  assert.match(dbSource, /rows\.filter\(\(row\) => !isQaFixtureColumn\(row\)\)/);
  assert.match(dbSource, /row && isQaFixtureColumn\(row\) \? null : row/);
  assert.match(dbSource, /if \(isQaFixtureColumn\(row\.post\)\) return null;/);

  const qaFixturePatterns = [/^qa-auto-\d+$/, /^qa-scroll-card-\d+-\d+$/];
  const matchesQaFixture = (value) =>
    qaFixturePatterns.some((pattern) => pattern.test(value));
  for (const hidden of [
    `qa-auto-${Date.now()}`,
    "qa-auto-1783847054944",
    "qa-scroll-card-1783844102197-5",
  ]) {
    assert.ok(matchesQaFixture(hidden), `QA fixture must be hidden: ${hidden}`);
  }
  for (const kept of [
    "omega3-after-meal",
    "qa-auto-guide",
    "quality-assurance-1",
    "vitamin-d-with-fat-meal",
  ]) {
    assert.ok(
      !matchesQaFixture(kept),
      `editorial column must stay public: ${kept}`
    );
  }

  console.log("column QA test-data safety checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
