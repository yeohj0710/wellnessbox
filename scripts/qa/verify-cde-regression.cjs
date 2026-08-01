/* eslint-disable no-console */
const { chromium } = require("playwright");
const path = require("path");
const {
  assertQaColumnMutationTarget,
  buildAdminPasswordCandidates,
  cleanupCreatedColumnPosts,
} = require("./lib/column-admin-api.cjs");
const {
  attachCdeNetworkCapture,
  runColumnAndAdminCrudScenario,
  runEmployeeReportScenario,
} = require("./lib/cde-regression-flow.cjs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const ADMIN_PASSWORD_CANDIDATES = buildAdminPasswordCandidates(process.env);

function pushFailure(failures, key, detail) {
  failures.push({ key, detail });
}

async function waitFor(condition, timeoutMs, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await condition();
    if (value) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function cleanupCreatedPosts(baseUrl, context, createdPosts, result) {
  if (!context || createdPosts.length === 0) return;

  const deletedStatuses = await cleanupCreatedColumnPosts(
    baseUrl,
    context,
    createdPosts
  );
  for (const deleted of deletedStatuses) {
    if (deleted.status !== null && ![200, 404].includes(deleted.status)) {
      pushFailure(result.failures, "column_post_delete_failed", {
        postId: deleted.postId,
        title: deleted.title,
        status: deleted.status,
      });
    }
  }
  result.checks.deletedPostStatuses = deletedStatuses;
}

async function run() {
  assertQaColumnMutationTarget(BASE_URL, process.env);
  if (ADMIN_PASSWORD_CANDIDATES.length === 0) {
    throw new Error("ADMIN_PASSWORD is required for qa:cde:regression");
  }

  const result = {
    baseUrl: BASE_URL,
    checks: {},
    network: {
      requests: [],
      responses: [],
    },
    failures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const createdPosts = [];

  await attachCdeNetworkCapture(page, result);

  try {
    await runColumnAndAdminCrudScenario({
      page,
      context,
      baseUrl: BASE_URL,
      adminPasswordCandidates: ADMIN_PASSWORD_CANDIDATES,
      createdPosts,
      result,
      pushFailure,
      waitFor,
    });

    await runEmployeeReportScenario({
      page,
      context,
      baseUrl: BASE_URL,
      result,
      pushFailure,
      waitFor,
    });
  } finally {
    await cleanupCreatedPosts(BASE_URL, context, createdPosts, result);
    await browser.close().catch(() => undefined);
  }

  result.ok = result.failures.length === 0;
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
