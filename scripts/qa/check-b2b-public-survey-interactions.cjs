/* eslint-disable no-console */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  stopProcessTree,
} = require("./lib/dev-server.cjs");
const { acquireQaLock } = require("./lib/qa-lock.cjs");

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_SURVEY_INTERACTION_PORT || "3118");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");

function chooseNumericInputValue(inputAttrs) {
  const min = Number.isFinite(Number(inputAttrs.min)) ? Number(inputAttrs.min) : 1;
  const max = Number.isFinite(Number(inputAttrs.max)) ? Number(inputAttrs.max) : min + 100;
  const forceInteger = inputAttrs.step === "1";
  let value = min + Math.max(1, Math.floor((max - min) / 2));
  if (value > max) value = max;
  if (forceInteger) value = Math.round(value);
  return String(value);
}

async function ensureSurveyQuestionVisible(page) {
  const question = page.locator('[data-testid="survey-question"]').first();
  const startButton = page.locator('[data-testid="survey-start-button"]').first();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const hasQuestion = (await question.count()) > 0 && (await question.isVisible());
    if (hasQuestion) return;
    const hasStart = (await startButton.count()) > 0 && (await startButton.isVisible());
    if (hasStart) {
      await startButton.click();
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(250);
  }
  await question.waitFor({ state: "visible", timeout: 10000 });
}

async function currentNode(page) {
  const node = page.locator('[data-testid="survey-question"]').first();
  await node.waitFor({ state: "visible", timeout: 10000 });
  const key = (await node.getAttribute("data-question-key")) || "";
  const type = (await node.getAttribute("data-question-type")) || "";
  return { node, key, type };
}

async function getSurveyTotalCount(page) {
  const title = await page.locator("header h2").first().innerText();
  const match = title.match(/\/\s*(\d+)\s*문항/);
  if (!match) {
    throw new Error(`failed to parse total count from title: ${title}`);
  }
  return Number(match[1]);
}

async function fillIfNeededForCurrentQuestion(page, nodeMeta) {
  if (nodeMeta.type === "number") {
    const input = nodeMeta.node.locator('[data-testid="survey-number-input"]').first();
    const attrs = {
      min: await input.getAttribute("min"),
      max: await input.getAttribute("max"),
      step: await input.getAttribute("step"),
    };
    await input.fill(chooseNumericInputValue(attrs));
    return;
  }

  if (nodeMeta.type === "group") {
    const inputs = nodeMeta.node.locator('input[data-testid^="survey-group-input-"]');
    const count = await inputs.count();
    for (let index = 0; index < count; index += 1) {
      const input = inputs.nth(index);
      const type = await input.getAttribute("type");
      if (type === "number") {
        const attrs = {
          min: await input.getAttribute("min"),
          max: await input.getAttribute("max"),
          step: await input.getAttribute("step"),
        };
        await input.fill(chooseNumericInputValue(attrs));
      } else {
        await input.fill(`test-${index + 1}`);
      }
    }
  }
}

async function clickNext(page) {
  await page.locator('[data-testid="survey-next-button"]').click();
  await page.waitForTimeout(80);
}

async function waitForResult(page) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if ((await page.locator('[data-testid="survey-result"]').count()) > 0) return true;
    if ((await page.locator('[data-testid="survey-calculating"]').count()) > 0) {
      await page.waitForTimeout(120);
      continue;
    }
    await page.waitForTimeout(120);
  }
  return false;
}

async function run() {
  const releaseQaLock = await acquireQaLock({
    lockName: "qa-dev-server",
    owner: "qa:b2b:public-survey-interactions",
  });

  const output = {
    baseUrl: BASE_URL,
    checks: {
      serverReady: false,
      c01TotalStable: false,
      c01DeselectSkipWorked: false,
      c05OptionalSkipWorked: false,
      c27TotalStableWhileSelecting: false,
      c27NoSelectionFinishWorked: false,
      resultResetToIntro: false,
    },
    failures: [],
  };

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

  let browser = null;
  try {
    output.checks.serverReady = await waitForServerReady(BASE_URL, {
      path: "/survey",
      timeoutMs: START_TIMEOUT_MS,
    });
    if (!output.checks.serverReady) throw new Error("dev server ready timeout");

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1600, height: 900 },
    });
    const page = await context.newPage();

    await page.goto("/survey", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureSurveyQuestionVisible(page);

    // C01: total should stay stable regardless of selected option.
    let nodeMeta = await currentNode(page);
    assert.equal(nodeMeta.key, "C01", "expected first question to be C01");
    const options = nodeMeta.node.locator('[data-testid="survey-option"]');
    const optionCount = await options.count();
    assert.ok(optionCount >= 2, "C01 options should have at least 2 items");
    const totalBefore = await getSurveyTotalCount(page);
    await options.nth(0).click();
    await page.waitForTimeout(80);
    const totalAfterA = await getSurveyTotalCount(page);
    await options.nth(1).click();
    await page.waitForTimeout(80);
    const totalAfterB = await getSurveyTotalCount(page);
    assert.equal(totalBefore, totalAfterA, "C01 total changed after first option");
    assert.equal(totalBefore, totalAfterB, "C01 total changed after second option");
    output.checks.c01TotalStable = true;

    // C01: click selected option again to deselect, then next should still work (selection optional).
    await options.nth(1).click();
    await clickNext(page);
    nodeMeta = await currentNode(page);
    assert.notEqual(nodeMeta.key, "C01", "C01 deselect + next should move to next question");
    output.checks.c01DeselectSkipWorked = true;

    // Move to C05 while filling only strict-required (number/group).
    for (let guard = 0; guard < 40; guard += 1) {
      nodeMeta = await currentNode(page);
      if (nodeMeta.key === "C05") break;
      await fillIfNeededForCurrentQuestion(page, nodeMeta);
      await clickNext(page);
    }
    nodeMeta = await currentNode(page);
    assert.equal(nodeMeta.key, "C05", "failed to reach C05");
    await clickNext(page);
    nodeMeta = await currentNode(page);
    assert.equal(nodeMeta.key, "C06", "C05 should be skippable without selection");
    output.checks.c05OptionalSkipWorked = true;

    // Move to C27.
    for (let guard = 0; guard < 100; guard += 1) {
      nodeMeta = await currentNode(page);
      if (nodeMeta.key === "C27") break;
      await fillIfNeededForCurrentQuestion(page, nodeMeta);
      await clickNext(page);
    }
    nodeMeta = await currentNode(page);
    assert.equal(nodeMeta.key, "C27", "failed to reach C27");

    // C27: selecting options should not change total count while still on C27.
    const c27Options = nodeMeta.node.locator('[data-testid="survey-multi-option"]');
    const c27OptionCount = await c27Options.count();
    assert.ok(c27OptionCount >= 2, "C27 options should have at least 2 items");
    const c27TotalBefore = await getSurveyTotalCount(page);
    await c27Options.nth(0).click();
    await page.waitForTimeout(80);
    const c27TotalAfterA = await getSurveyTotalCount(page);
    await c27Options.nth(1).click();
    await page.waitForTimeout(80);
    const c27TotalAfterB = await getSurveyTotalCount(page);
    assert.equal(c27TotalBefore, c27TotalAfterA, "C27 total changed after first selection");
    assert.equal(c27TotalBefore, c27TotalAfterB, "C27 total changed after second selection");
    output.checks.c27TotalStableWhileSelecting = true;

    // Deselect all and finish with no section selected.
    await c27Options.nth(0).click();
    await c27Options.nth(1).click();
    await clickNext(page);
    const reachedResult = await waitForResult(page);
    assert.equal(reachedResult, true, "C27 no-selection path should reach result");
    output.checks.c27NoSelectionFinishWorked = true;

    await page.locator('[data-testid="survey-result-reset-button"]').click();
    await page
      .locator('[data-testid="survey-start-button"]')
      .waitFor({ state: "visible", timeout: 8000 });
    output.checks.resultResetToIntro = true;

    output.ok = true;
  } catch (error) {
    output.ok = false;
    output.failures.push({
      key: "survey_interactions_failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    await stopProcessTree(devProc);
    releaseQaLock();
  }

  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
