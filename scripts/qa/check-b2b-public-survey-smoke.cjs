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

async function answerCurrentQuestion(page, output) {
  const question = page.locator('[data-testid="survey-question"]').first();
  await question.waitFor({ state: "visible", timeout: 10000 });

  const key = (await question.getAttribute("data-question-key")) || "";
  const type = (await question.getAttribute("data-question-type")) || "";
  output.checks.visitedQuestions.push({ key, type });

  if (type === "single") {
    const options = question.locator('[data-testid="survey-option"]');
    const optionCount = await options.count();
    if (optionCount === 0) throw new Error(`single option missing: ${key}`);
    if (key === "C01" && optionCount > 1) {
      // C04(displayIf) 분기 검증을 위해 C01 두 번째 보기를 선택한다.
      await options.nth(1).click();
    } else {
      await options.first().click();
    }
    return key;
  }

  if (type === "multi") {
    const options = question.locator('[data-testid="survey-multi-option"]');
    const optionCount = await options.count();
    if (optionCount === 0) throw new Error(`multi option missing: ${key}`);
    if (key === "C27" && optionCount >= 2) {
      await options.nth(0).click();
      await options.nth(1).click();
    } else {
      await options.nth(0).click();
    }
    return key;
  }

  if (type === "number") {
    const input = question.locator('[data-testid="survey-number-input"]').first();
    await input.waitFor({ state: "visible", timeout: 5000 });
    const inputAttrs = {
      min: await input.getAttribute("min"),
      max: await input.getAttribute("max"),
      step: await input.getAttribute("step"),
    };
    await input.fill(chooseNumericInputValue(inputAttrs));
    return key;
  }

  if (type === "group") {
    const inputs = question.locator('input[data-testid^="survey-group-input-"]');
    const inputCount = await inputs.count();
    if (inputCount === 0) throw new Error(`group input missing: ${key}`);
    for (let index = 0; index < inputCount; index += 1) {
      const input = inputs.nth(index);
      const inputType = await input.getAttribute("type");
      if (inputType === "number") {
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
    return key;
  }

  const fallbackInput = question.locator("input, textarea").first();
  const fallbackCount = await fallbackInput.count();
  if (fallbackCount > 0) {
    await fallbackInput.fill("test");
  }
  return key;
}

async function ensureSurveyQuestionVisible(page) {
  const question = page.locator('[data-testid="survey-question"]').first();
  const startButton = page.locator('[data-testid="survey-start-button"]').first();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const hasQuestion = (await question.count()) > 0 && (await question.isVisible());
    if (hasQuestion) return;

    const hasStartButton = (await startButton.count()) > 0 && (await startButton.isVisible());
    if (hasStartButton) {
      await startButton.click();
      await page.waitForTimeout(250);
      continue;
    }

    await page.waitForTimeout(250);
  }

  await question.waitFor({ state: "visible", timeout: 10000 });
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
    const page = await context.newPage();

    await page.goto("/survey", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await ensureSurveyQuestionVisible(page);

    const keyVisitCount = new Map();
    const maxSteps = 600;
    for (let step = 0; step < maxSteps; step += 1) {
      const hasResult = (await page.locator('[data-testid="survey-result"]').count()) > 0;
      if (hasResult) {
        output.checks.resultVisible = true;
        output.checks.steps = step;
        break;
      }

      const hasCalculating =
        (await page.locator('[data-testid="survey-calculating"]').count()) > 0;
      if (hasCalculating) {
        await page.waitForTimeout(120);
        continue;
      }

      const questionKey = await answerCurrentQuestion(page, output);
      const next = (keyVisitCount.get(questionKey) || 0) + 1;
      keyVisitCount.set(questionKey, next);
      if (next > 5) {
        throw new Error(`question loop detected at ${questionKey}`);
      }

      await page.locator('[data-testid="survey-next-button"]').click();
      await page.waitForTimeout(60);
    }

    if (!output.checks.resultVisible) {
      throw new Error("result screen not reached within max steps");
    }

    const visitedKeySet = new Set(output.checks.visitedQuestions.map((item) => item.key));
    if (!visitedKeySet.has("C04")) {
      throw new Error("displayIf branch verification failed: C04 was not visited");
    }

    output.checks.uniqueQuestionCount = visitedKeySet.size;

    await page.locator('[data-testid="survey-result-reset-button"]').click();
    await page
      .locator('[data-testid="survey-start-button"]')
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
