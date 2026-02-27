/* eslint-disable no-console */
const path = require("path");
const { chromium } = require("playwright");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  stopProcessTree,
} = require("./lib/dev-server.cjs");
const { acquireQaLock } = require("./lib/qa-lock.cjs");
const {
  buildAdminPasswordCandidates,
  deleteColumnPost,
} = require("./lib/column-admin-api.cjs");
const {
  runRouteScrollAndColumnCardScenario,
} = require("./lib/route-scroll/scenario.cjs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_ROUTE_SCROLL_PORT || "3113");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");
const ADMIN_PASSWORD_CANDIDATES = buildAdminPasswordCandidates(process.env);

function pushFailure(output, key, detail) {
  output.failures.push({ key, detail });
}

async function cleanupCreatedPosts(baseUrl, context, createdPosts, output) {
  if (!context || createdPosts.length === 0) return;

  const deletedStatuses = [];
  for (const post of createdPosts) {
    const deletedStatus = await deleteColumnPost(baseUrl, context, post.id).catch(() => null);
    deletedStatuses.push({
      postId: post.id,
      status: deletedStatus,
    });
    if (deletedStatus !== null && ![200, 404].includes(deletedStatus)) {
      pushFailure(output, "column_post_delete_failed", {
        postId: post.id,
        status: deletedStatus,
      });
    }
  }
  output.checks.deletedPostStatuses = deletedStatuses;
}

async function run() {
  if (ADMIN_PASSWORD_CANDIDATES.length === 0) {
    throw new Error("ADMIN_PASSWORD is required for qa:route-scroll");
  }
  const releaseQaLock = await acquireQaLock({
    lockName: "qa-dev-server",
    owner: "qa:route-scroll",
  });

  const nextDevBin = resolveNextDevCommand(ROOT);
  const devProc = spawnNextDev({
    rootDir: ROOT,
    nextDevBin,
    port: QA_PORT,
    env: {
      ...process.env,
      PORT: String(QA_PORT),
    },
  });

  devProc.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk.toString()}`));
  devProc.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk.toString()}`));

  const output = {
    baseUrl: BASE_URL,
    checks: {},
    failures: [],
  };

  let browser = null;
  let context = null;
  const createdPosts = [];

  try {
    const ready = await waitForServerReady(BASE_URL, {
      path: "/column",
      timeoutMs: START_TIMEOUT_MS,
    });
    output.checks.serverReady = ready;
    if (!ready) throw new Error("dev server ready timeout");

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1600, height: 760 },
    });
    const page = await context.newPage();

    const scenario = await runRouteScrollAndColumnCardScenario({
      page,
      context,
      baseUrl: BASE_URL,
      adminPasswordCandidates: ADMIN_PASSWORD_CANDIDATES,
      output,
      pushFailure,
    });
    createdPosts.push(...(scenario.createdPosts || []));
  } finally {
    await cleanupCreatedPosts(BASE_URL, context, createdPosts, output);

    if (browser) {
      await browser.close().catch(() => undefined);
    }
    await stopProcessTree(devProc);
    releaseQaLock();
  }

  output.ok = output.failures.length === 0;
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
