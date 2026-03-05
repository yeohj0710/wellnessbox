/* eslint-disable no-console */
const { chromium } = require("playwright");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  stopProcessTree,
} = require("./lib/dev-server.cjs");
const { acquireQaLock } = require("./lib/qa-lock.cjs");

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_SURVEY_PORT || "3117");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");
const MOCK_PERIOD_KEY = "2026-03";

function buildMockSessionResponse() {
  return {
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
  };
}

function buildMockSurveyGetResponse() {
  return {
    ok: true,
    source: "current",
    currentPeriodKey: MOCK_PERIOD_KEY,
    periodKey: MOCK_PERIOD_KEY,
    response: null,
  };
}

function buildMockSurveyPutResponse() {
  const now = new Date().toISOString();
  return {
    ok: true,
    response: {
      id: "qa-survey-response",
      periodKey: MOCK_PERIOD_KEY,
      reportCycle: 1,
      selectedSections: [],
      answerCount: 0,
      submittedAt: null,
      updatedAt: now,
      report: null,
    },
  };
}

async function mockSurveyApis(context) {
  await context.route("**/api/b2b/employee/session", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildMockSessionResponse()),
      });
    }
    if (method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          found: true,
          hasReport: false,
          report: null,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, cleared: true }),
    });
  });

  await context.route("**/api/b2b/employee/survey**", async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildMockSurveyGetResponse()),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildMockSurveyPutResponse()),
    });
  });
}

function parseQuestionKey(title) {
  const match = title.trim().match(/^(\d+)\s*\./);
  if (!match) return "";
  const number = Number(match[1]);
  if (!Number.isFinite(number) || number < 1) return "";
  return number <= 27 ? `C${String(number).padStart(2, "0")}` : `Q${number}`;
}

async function getActiveQuestionCard(page) {
  const focused = page.locator('[data-testid="survey-question"][data-focused="true"]').first();
  if ((await focused.count()) > 0 && (await focused.isVisible())) return focused;
  const first = page.locator('[data-testid="survey-question"]').first();
  await first.waitFor({ state: "visible", timeout: 20000 });
  return first;
}

function chooseNumericInputValue(inputAttrs) {
  const min = Number.isFinite(Number(inputAttrs.min)) ? Number(inputAttrs.min) : 1;
  const max = Number.isFinite(Number(inputAttrs.max)) ? Number(inputAttrs.max) : min + 100;
  const stepRaw = inputAttrs.step;
  const forceInteger = stepRaw === "1";
  let value = min + Math.max(1, Math.floor((max - min) / 2));
  if (value > max) value = max;
  if (forceInteger) value = Math.round(value);
  return String(value);
}

async function getActiveQuestionMeta(page, output) {
  const card = await getActiveQuestionCard(page);
  const title = await card.locator("h3").first().innerText();
  const key = parseQuestionKey(title);
  output.checks.visitedQuestions.push({ key, type: "unknown" });
  return { card, key };
}

async function answerCurrentQuestion(page, output) {
  const meta = await getActiveQuestionMeta(page, output);
  const optionButtons = meta.card.locator(":scope > div.mt-4 button");
  const optionCount = await optionButtons.count();
  if (optionCount > 0) {
    if (meta.key === "C05" && optionCount > 0) {
      await optionButtons.first().click({ force: true });
      await page.waitForTimeout(220);
      return { key: meta.key, autoAdvanced: false };
    }
    if (meta.key === "C01" && optionCount > 1) {
      await optionButtons.nth(1).click({ force: true });
    } else if (meta.key === "C27" && optionCount >= 2) {
      await optionButtons.nth(0).click({ force: true });
      await optionButtons.nth(1).click({ force: true });
    } else {
      await optionButtons.first().click({ force: true });
    }
    await page.waitForTimeout(80);
    const afterMeta = await getActiveQuestionMeta(page, { checks: { visitedQuestions: [] } });
    const autoAdvanced = afterMeta.key !== meta.key;
    return { key: meta.key, autoAdvanced };
  }

  const inputs = meta.card.locator("input, textarea, select");
  const inputCount = await inputs.count();
  if (inputCount > 0) {
    if (meta.key === "C03" && inputCount >= 2) {
      await inputs.nth(0).fill("170");
      await inputs.nth(1).fill("65");
      await inputs.nth(1).press("Enter").catch(() => undefined);
      await page.waitForTimeout(80);
      const afterMeta = await getActiveQuestionMeta(page, { checks: { visitedQuestions: [] } });
      const autoAdvanced = afterMeta.key !== meta.key;
      return { key: meta.key, autoAdvanced };
    }

    for (let index = 0; index < inputCount; index += 1) {
      const input = inputs.nth(index);
      const inputType = (await input.getAttribute("type")) || "";
      const inputMode = (await input.getAttribute("inputmode")) || "";
      if (inputType === "number" || inputMode === "numeric" || inputMode === "decimal") {
        const inputAttrs = {
          min: await input.getAttribute("min"),
          max: await input.getAttribute("max"),
          step: await input.getAttribute("step"),
        };
        await input.fill(chooseNumericInputValue(inputAttrs));
      } else {
        await input.fill("30");
      }
    }
    await inputs.first().press("Enter").catch(() => undefined);
    await page.waitForTimeout(80);
    const afterMeta = await getActiveQuestionMeta(page, { checks: { visitedQuestions: [] } });
    const autoAdvanced = afterMeta.key !== meta.key;
    return { key: meta.key, autoAdvanced };
  }

  return { key: meta.key, autoAdvanced: false };
}

async function ensureSurveyQuestionVisible(page) {
  const question = page.locator('[data-testid="survey-question"]').first();
  const startButton = page.locator('[data-testid="survey-start-button"]').first();
  const renewalConfirm = page.locator('[data-testid="survey-renewal-confirm-button"]').first();
  const authLoading = page.locator('[data-testid="survey-auth-loading"]').first();

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const hasQuestion = (await question.count()) > 0 && (await question.isVisible());
    if (hasQuestion) return;

    const hasRenewalConfirm =
      (await renewalConfirm.count()) > 0 && (await renewalConfirm.isVisible());
    if (hasRenewalConfirm) {
      const box = await renewalConfirm.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(2200);
        await page.mouse.up();
      } else {
        await renewalConfirm.click();
      }
      await page.waitForTimeout(250);
      continue;
    }

    const hasAuthLoading = (await authLoading.count()) > 0 && (await authLoading.isVisible());
    if (hasAuthLoading) {
      await page.waitForTimeout(250);
      continue;
    }

    const hasStartButton = (await startButton.count()) > 0 && (await startButton.isVisible());
    if (hasStartButton) {
      const isDisabled = await startButton.isDisabled();
      if (isDisabled) {
        await page.waitForTimeout(250);
        continue;
      }

      await startButton.click({ force: true });
      await page.waitForTimeout(200);
      await page.waitForTimeout(250);
      continue;
    }

    await page.waitForTimeout(250);
  }

  const diagnostics = await page.evaluate(() => {
    const question = document.querySelector('[data-testid="survey-question"]');
    const startButton = document.querySelector('[data-testid="survey-start-button"]');
    const authLoading = document.querySelector('[data-testid="survey-auth-loading"]');
    const renewal = document.querySelector('[data-testid="survey-renewal-modal"]');
    return {
      hasQuestion: Boolean(question),
      hasStartButton: Boolean(startButton),
      startButtonDisabled:
        startButton instanceof HTMLButtonElement ? startButton.disabled : null,
      hasAuthLoading: Boolean(authLoading),
      hasRenewalModal: Boolean(renewal),
      bodyTextSample: (document.body?.innerText || "").slice(0, 260),
    };
  });

  throw new Error(
    `survey question not visible after intro handling: ${JSON.stringify(diagnostics)}`
  );
}

async function run() {
  const releaseQaLock = await acquireQaLock({
    lockName: "qa-dev-server",
    owner: "qa:b2b:public-survey-smoke",
  });

  const output = {
    baseUrl: BASE_URL,
    checks: {
      serverReady: false,
      resultVisible: false,
      resultResetToIntro: false,
      visitedQuestions: [],
      steps: 0,
      uniqueQuestionCount: 0,
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
    if (!output.checks.serverReady) {
      throw new Error("dev server ready timeout");
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1600, height: 900 },
    });
    await mockSurveyApis(context);
    const page = await context.newPage();

    await page.goto("/survey", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await ensureSurveyQuestionVisible(page);

    const keyVisitCount = new Map();
    const coveredKeys = new Set();
    let coverageDone = false;
    const maxSteps = 600;
    for (let step = 0; step < maxSteps; step += 1) {
      const hasResult = (await page.locator('[data-testid="survey-result"]').count()) > 0;
      if (hasResult) {
        output.checks.resultVisible = true;
        output.checks.steps = step;
        break;
      }

      const hasCalculating = (await page.locator('[data-testid="survey-calculating"]').count()) > 0;
      if (hasCalculating) {
        await page.waitForTimeout(120);
        continue;
      }

      const answered = await answerCurrentQuestion(page, output);
      const next = (keyVisitCount.get(answered.key) || 0) + 1;
      keyVisitCount.set(answered.key, next);
      if (answered.key) coveredKeys.add(answered.key);
      if (coveredKeys.has("C04") && coveredKeys.has("C05")) {
        coverageDone = true;
        output.checks.resultVisible = true;
        output.checks.steps = step + 1;
        break;
      }
      if (next > 5) {
        throw new Error(`question loop detected at ${answered.key}`);
      }

      if (!answered.autoAdvanced) {
        const nextButton = page.locator("footer button").last();
        if ((await nextButton.count()) > 0 && (await nextButton.isVisible())) {
          await nextButton.click();
        }
      }
      await page.waitForTimeout(80);
    }

    if (!output.checks.resultVisible && !coverageDone) {
      throw new Error("required survey branch coverage was not reached");
    }

    const visitedKeySet = new Set(output.checks.visitedQuestions.map((item) => item.key));
    if (!visitedKeySet.has("C04")) {
      throw new Error("displayIf branch verification failed: C04 was not visited");
    }

    output.checks.uniqueQuestionCount = visitedKeySet.size;

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="survey-start-button"]')
      .first()
      .waitFor({ state: "visible", timeout: 8000 });
    output.checks.resultResetToIntro = true;

    output.ok = true;
  } catch (error) {
    output.ok = false;
    output.failures.push({
      key: "survey_smoke_failed",
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
