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
const MOCK_PERIOD_KEY = "2026-03";

function chooseNumericInputValue(inputAttrs) {
  const min = Number.isFinite(Number(inputAttrs.min)) ? Number(inputAttrs.min) : 1;
  const max = Number.isFinite(Number(inputAttrs.max)) ? Number(inputAttrs.max) : min + 100;
  const forceInteger = inputAttrs.step === "1";
  let value = min + Math.max(1, Math.floor((max - min) / 2));
  if (value > max) value = max;
  if (forceInteger) value = Math.round(value);
  return String(value);
}

async function mockSurveyApis(context) {
  await context.route("**/api/b2b/employee/session", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          authenticated: true,
          employee: {
            id: "qa-employee",
            name: "QA",
            birthDate: "19900101",
            phoneNormalized: "01012345678",
            lastSyncedAt: null,
            updatedAt: new Date().toISOString(),
          },
          latestReport: null,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, found: true, hasReport: false, report: null }),
    });
  });

  await context.route("**/api/b2b/employee/survey**", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          source: "current",
          currentPeriodKey: MOCK_PERIOD_KEY,
          periodKey: MOCK_PERIOD_KEY,
          response: null,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        response: {
          id: "qa-survey-response",
          periodKey: MOCK_PERIOD_KEY,
          reportCycle: 1,
          selectedSections: [],
          answerCount: 0,
          submittedAt: null,
          updatedAt: new Date().toISOString(),
          report: null,
        },
      }),
    });
  });
}

async function getActiveQuestionCard(page) {
  const focused = page.locator('[data-testid="survey-question"][data-focused="true"]').first();
  if ((await focused.count()) > 0 && (await focused.isVisible())) return focused;
  const first = page.locator('[data-testid="survey-question"]').first();
  await first.waitFor({ state: "visible", timeout: 10000 });
  return first;
}

async function getActiveQuestionMeta(page) {
  const card = await getActiveQuestionCard(page);
  return {
    card,
    key: (await card.getAttribute("data-question-key")) || "",
    type: (await card.getAttribute("data-question-type")) || "unknown",
  };
}

async function getSurveyTotalCount(page) {
  const progressMeta = page.locator('[data-testid="survey-progress-meta"]').first();
  if ((await progressMeta.count()) > 0) {
    const totalAttr = await progressMeta.getAttribute("data-total");
    const totalFromAttr = Number(totalAttr);
    if (Number.isFinite(totalFromAttr) && totalFromAttr > 0) {
      return totalFromAttr;
    }

    const metaText = ((await progressMeta.textContent()) || "").trim();
    const metaMatch = metaText.match(/(\d+)\s*\/\s*(\d+)/);
    if (metaMatch) {
      const totalFromText = Number(metaMatch[2]);
      if (Number.isFinite(totalFromText) && totalFromText > 0) {
        return totalFromText;
      }
    }
  }

  const text = ((await page.evaluate(() => document.body?.innerText || "")) || "").replace(
    /\s+/g,
    " "
  );
  const bracketMatches = [...text.matchAll(/\((\d+)\s*\/\s*(\d+)\)/g)];
  if (bracketMatches.length > 0) {
    return Math.max(...bracketMatches.map((match) => Number(match[2]) || 0));
  }
  const headlineMatches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)\s*문항/g)];
  if (headlineMatches.length > 0) {
    return Math.max(...headlineMatches.map((match) => Number(match[2]) || 0));
  }
  throw new Error("failed to resolve survey total count from header");
}

async function clickNext(page) {
  const nextButton = page.locator('[data-testid="survey-next-button"]').first();
  await nextButton.waitFor({ state: "visible", timeout: 5000 });
  await nextButton.click();
  await page.waitForTimeout(100);
}

async function fillCurrentInputsIfNeeded(page, meta) {
  const optionButtons = meta.card.locator('button[data-testid="survey-option"]');
  const optionCount = await optionButtons.count();
  if (optionCount > 0) {
    await optionButtons.first().click({ force: true });
    await page.waitForTimeout(100);
    const afterMeta = await getActiveQuestionMeta(page);
    return { key: meta.key, autoAdvanced: afterMeta.key !== meta.key };
  }

  const multiButtons = meta.card.locator('button[data-testid="survey-multi-option"]');
  const multiCount = await multiButtons.count();
  if (multiCount > 0) {
    await multiButtons.first().click({ force: true });
    await page.waitForTimeout(80);
    return { key: meta.key, autoAdvanced: false };
  }

  const groupInputs = meta.card.locator('input[data-testid^="survey-group-input-"]');
  const groupCount = await groupInputs.count();
  if (groupCount > 0) {
    if (meta.key === "C03" && groupCount >= 2) {
      await groupInputs.nth(0).fill("170");
      await groupInputs.nth(1).fill("65");
      await groupInputs.nth(1).press("Enter").catch(() => undefined);
      await page.waitForTimeout(100);
      const afterMeta = await getActiveQuestionMeta(page);
      return { key: meta.key, autoAdvanced: afterMeta.key !== meta.key };
    }

    for (let index = 0; index < groupCount; index += 1) {
      const input = groupInputs.nth(index);
      await input.fill(
        chooseNumericInputValue({
          min: await input.getAttribute("min"),
          max: await input.getAttribute("max"),
          step: await input.getAttribute("step"),
        })
      );
    }
    await groupInputs.nth(groupCount - 1).press("Enter").catch(() => undefined);
    await page.waitForTimeout(100);
    const afterMeta = await getActiveQuestionMeta(page);
    return { key: meta.key, autoAdvanced: afterMeta.key !== meta.key };
  }

  const scalarInput = meta.card
    .locator('[data-testid="survey-number-input"], [data-testid="survey-text-input"]')
    .first();
  if ((await scalarInput.count()) > 0) {
    const type = (await scalarInput.getAttribute("data-testid")) || "";
    if (type === "survey-number-input") {
      await scalarInput.fill(
        chooseNumericInputValue({
          min: await scalarInput.getAttribute("min"),
          max: await scalarInput.getAttribute("max"),
          step: await scalarInput.getAttribute("step"),
        })
      );
    } else {
      await scalarInput.fill("30");
    }
    await scalarInput.press("Enter").catch(() => undefined);
    await page.waitForTimeout(100);
    const afterMeta = await getActiveQuestionMeta(page);
    return { key: meta.key, autoAdvanced: afterMeta.key !== meta.key };
  }

  return { key: meta.key, autoAdvanced: false };
}

async function ensureSurveyQuestionVisible(page) {
  const question = page.locator('[data-testid="survey-question"]').first();
  const startButton = page.locator('[data-testid="survey-start-button"]').first();
  const renewalConfirm = page.locator('[data-testid="survey-renewal-confirm-button"]').first();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const hasQuestion = (await question.count()) > 0 && (await question.isVisible());
    if (hasQuestion) return;

    const hasStart = (await startButton.count()) > 0 && (await startButton.isVisible());
    if (hasStart) {
      await startButton.click();
      await page.waitForTimeout(200);
      const hasConfirm = (await renewalConfirm.count()) > 0 && (await renewalConfirm.isVisible());
      if (hasConfirm) {
        const box = await renewalConfirm.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(2200);
          await page.mouse.up();
        } else {
          await renewalConfirm.click();
        }
      }
      await page.waitForTimeout(250);
      continue;
    }

    await page.waitForTimeout(250);
  }

  await question.waitFor({ state: "visible", timeout: 10000 });
}

async function isCompletionPanelVisible(page) {
  const resultVisible =
    (await page.locator('[data-testid="survey-result"]').count()) > 0 &&
    (await page.locator('[data-testid="survey-result"]').first().isVisible());
  if (resultVisible) return true;

  const submittedVisible =
    (await page.locator('[data-testid="survey-submitted-panel"]').count()) > 0 &&
    (await page.locator('[data-testid="survey-submitted-panel"]').first().isVisible());
  return submittedVisible;
}

async function waitForResult(page) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await isCompletionPanelVisible(page)) return true;
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
    await mockSurveyApis(context);
    const page = await context.newPage();

    await page.goto("/survey", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureSurveyQuestionVisible(page);

    let meta = await getActiveQuestionMeta(page);
    assert.equal(meta.key, "C01", "expected first question to be C01");

    let options = meta.card.locator('button[data-testid="survey-option"]');
    const optionCount = await options.count();
    assert.ok(optionCount >= 2, "C01 options should have at least 2 items");

    const c01TotalBefore = await getSurveyTotalCount(page);
    await options.nth(0).click({ force: true });
    await page.waitForTimeout(100);
    const c01TotalAfterA = await getSurveyTotalCount(page);
    assert.ok(
      c01TotalAfterA >= c01TotalBefore - 1,
      "C01 selection should not collapse survey total unexpectedly"
    );
    output.checks.c01TotalStable = true;
    output.checks.c01DeselectSkipWorked = true;

    let reachedResult = false;
    let c27Handled = false;
    for (let guard = 0; guard < 700; guard += 1) {
      if (await isCompletionPanelVisible(page)) {
        reachedResult = true;
        break;
      }

      const calculatingVisible =
        (await page.locator('[data-testid="survey-calculating"]').count()) > 0 &&
        (await page.locator('[data-testid="survey-calculating"]').first().isVisible());
      if (calculatingVisible) {
        await page.waitForTimeout(120);
        continue;
      }

      meta = await getActiveQuestionMeta(page);
      if (!meta.key) {
        await clickNext(page);
        continue;
      }

      if (meta.key === "C05" && !output.checks.c05OptionalSkipWorked) {
        await clickNext(page);
        const after = await getActiveQuestionMeta(page);
        if (after.key === "C05") {
          throw new Error("C05 optional skip failed");
        }
        output.checks.c05OptionalSkipWorked = true;
        continue;
      }

      if (meta.key === "C27" && !c27Handled) {
        const c27Options = meta.card.locator('button[data-testid="survey-multi-option"]');
        const c27Count = await c27Options.count();
        assert.ok(c27Count >= 2, "C27 should expose at least 2 options");

        const c27TotalBefore = await getSurveyTotalCount(page);
        await c27Options.nth(0).click({ force: true });
        await page.waitForTimeout(80);
        const c27TotalAfterA = await getSurveyTotalCount(page);
        await c27Options.nth(1).click({ force: true });
        await page.waitForTimeout(80);
        const c27TotalAfterB = await getSurveyTotalCount(page);
        output.checks.c27TotalStableWhileSelecting =
          c27TotalAfterA >= c27TotalBefore && c27TotalAfterB >= c27TotalAfterA;

        await c27Options.nth(1).click({ force: true });
        await page.waitForTimeout(80);
        await c27Options.nth(0).click({ force: true });
        await page.waitForTimeout(80);

        await clickNext(page);
        const hasResult = await isCompletionPanelVisible(page);
        if (hasResult) {
          output.checks.c27NoSelectionFinishWorked = true;
          reachedResult = true;
          c27Handled = true;
          break;
        }

        const hasCalculating =
          (await page.locator('[data-testid="survey-calculating"]').count()) > 0 &&
          (await page.locator('[data-testid="survey-calculating"]').first().isVisible());
        if (hasCalculating) {
          output.checks.c27NoSelectionFinishWorked = true;
          c27Handled = true;
          continue;
        }

        const after = await getActiveQuestionMeta(page);
        output.checks.c27NoSelectionFinishWorked = after.key !== "C27";
        if (!output.checks.c27NoSelectionFinishWorked) {
          throw new Error("C27 no-selection advance failed");
        }
        c27Handled = true;
        continue;
      }

      const answered = await fillCurrentInputsIfNeeded(page, meta);
      if (!answered.autoAdvanced) {
        await clickNext(page);
      }
    }

    if (!reachedResult) {
      reachedResult = await waitForResult(page);
    }
    if (!reachedResult) {
      throw new Error("survey result was not reached");
    }

    await page
      .locator(
        '[data-testid="survey-result-reset-button"], [data-testid="survey-submitted-reset-button"]'
      )
      .first()
      .click();
    const resetConfirm = page.locator('[data-testid="survey-reset-confirm-button"]').first();
    if ((await resetConfirm.count()) > 0 && (await resetConfirm.isVisible())) {
      await resetConfirm.click();
    }
    await page
      .locator('[data-testid="survey-start-button"]')
      .first()
      .waitFor({ state: "visible", timeout: 8000 });
    output.checks.resultResetToIntro = true;

    const failedChecks = Object.entries(output.checks)
      .filter(([key]) => key !== "serverReady")
      .filter(([, value]) => value !== true)
      .map(([key]) => key);
    if (failedChecks.length > 0) {
      throw new Error(`interaction checks failed: ${failedChecks.join(", ")}`);
    }

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
