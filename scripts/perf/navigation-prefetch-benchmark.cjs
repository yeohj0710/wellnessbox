#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.WB_PERF_PORT || 4102);
const BASE_URL = `http://${HOST}:${PORT}`;
const DEV_START_TIMEOUT_MS = Number(process.env.WB_PERF_START_TIMEOUT_MS || 180000);
const REPEATS = Number(process.env.WB_PERF_REPEATS || 2);
const HOVER_DWELL_MS = Number(process.env.WB_PERF_HOVER_DWELL_MS || 350);
const OUTPUT_PATH =
  process.env.WB_PERF_OUT || path.join("tmp", "perf", "navigation-prefetch.json");

const NAV_MARKER_SCRIPT = `
(() => {
  if (window.__WB_NAV) return;
  const state = {
    armed: false,
    clickAt: null,
    routeStartAt: null,
  };
  const wrapHistory = (name) => {
    const original = history[name];
    history[name] = function wrappedHistoryState(...args) {
      if (state.armed && state.routeStartAt === null) {
        state.routeStartAt = performance.now();
      }
      return original.apply(this, args);
    };
  };
  wrapHistory("pushState");
  wrapHistory("replaceState");
  document.addEventListener(
    "click",
    () => {
      if (!state.armed || state.clickAt !== null) return;
      state.clickAt = performance.now();
    },
    true
  );
  window.__WB_NAV = {
    arm() {
      state.armed = true;
      state.clickAt = null;
      state.routeStartAt = null;
    },
    disarm() {
      state.armed = false;
    },
    read() {
      return {
        armed: state.armed,
        clickAt: state.clickAt,
        routeStartAt: state.routeStartAt,
      };
    },
  };
})();
`;

const SCENARIOS = [
  {
    id: "home_to_explore",
    label: "Home -> Explore",
    startPath: "/",
    async getTarget(page) {
      const locator = page.locator('a[href="/explore"]').first();
      await locator.waitFor({ state: "visible", timeout: 20000 });
      return locator;
    },
    async waitUntilReady(page) {
      await page.waitForFunction(() => window.location.pathname === "/explore", null, {
        timeout: 15000,
      });
      await page.waitForSelector("#home-products", { state: "visible", timeout: 15000 });
    },
  },
  {
    id: "home_to_product_detail",
    label: "Home -> Product Detail(query)",
    startPath: "/",
    async getTarget(page) {
      const badgeButtons = page
        .locator("button.group.relative.flex.h-full.flex-col")
        .filter({ has: page.locator("span", { hasText: "#1" }) });
      const locator = badgeButtons.first();
      await locator.waitFor({ state: "visible", timeout: 25000 });
      await locator.scrollIntoViewIfNeeded();
      return locator;
    },
    async waitUntilReady(page) {
      await page.waitForFunction(
        () => new URL(window.location.href).searchParams.has("product"),
        null,
        { timeout: 15000 }
      );
      await page.waitForSelector("div.z-20.fixed.inset-0.bg-white", {
        state: "visible",
        timeout: 15000,
      });
    },
  },
  {
    id: "explore_to_product_detail",
    label: "Explore -> Product Detail(query)",
    startPath: "/explore",
    async getTarget(page) {
      const badgeButtons = page
        .locator("button.group.relative.flex.h-full.flex-col")
        .filter({ has: page.locator("span", { hasText: "#1" }) });
      const locator = badgeButtons.first();
      await locator.waitFor({ state: "visible", timeout: 25000 });
      await locator.scrollIntoViewIfNeeded();
      return locator;
    },
    async waitUntilReady(page) {
      await page.waitForFunction(
        () => new URL(window.location.href).searchParams.has("product"),
        null,
        { timeout: 15000 }
      );
      await page.waitForSelector("div.z-20.fixed.inset-0.bg-white", {
        state: "visible",
        timeout: 15000,
      });
    },
  },
  {
    id: "home_to_chat",
    label: "Home -> Chat",
    startPath: "/",
    async getTarget(page) {
      const locator = page.locator('a[href="/chat"]').first();
      await locator.waitFor({ state: "visible", timeout: 20000 });
      return locator;
    },
    async waitUntilReady(page) {
      await page.waitForFunction(() => window.location.pathname === "/chat", null, {
        timeout: 15000,
      });
      await page.waitForSelector("textarea", { state: "visible", timeout: 15000 });
    },
  },
];

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isLikelyPrefetch(request) {
  const url = request.url;
  const headers = request.headers || {};
  if (url.includes("_rsc=")) return true;
  if (url.includes("__flight__")) return true;
  if (url.includes("prefetch")) return true;
  if (headers["purpose"] === "prefetch") return true;
  if (headers["sec-purpose"] === "prefetch") return true;
  if (headers["next-router-prefetch"] === "1") return true;
  if (request.resourceType === "script" && url.includes("/_next/static/chunks/")) return true;
  return false;
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(url, timeoutMs) {
  const startedAt = Date.now();
  for (;;) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Next dev server not ready within ${timeoutMs}ms`);
    }
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status >= 300) return;
    } catch {}
    await wait(750);
  }
}

function startDevServer() {
  const isWindows = process.platform === "win32";
  const command = isWindows ? "cmd.exe" : "npm";
  const args = isWindows
    ? ["/d", "/s", "/c", `npm run dev -- -p ${PORT} -H ${HOST}`]
    : ["run", "dev", "--", "-p", String(PORT), "-H", HOST];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[next:out] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[next:err] ${chunk}`);
  });

  return child;
}

function stopDevServer(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
        stdio: "ignore",
      });
    } else {
      child.kill("SIGTERM");
    }
  } catch {}
}

async function runOne({ browser, scenario, mode, repeatIndex, constrained }) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
  });

  if (constrained) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: {
          effectiveType: "3g",
          saveData: true,
          downlink: 0.7,
          rtt: 300,
          type: "cellular",
          addEventListener() {},
          removeEventListener() {},
        },
      });
    });
  }

  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => {
    requests.push({
      ts: Date.now(),
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      headers: request.headers(),
    });
  });

  await page.addInitScript(NAV_MARKER_SCRIPT);
  await page.goto(`${BASE_URL}${scenario.startPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__WB_PREFETCH_DEBUG_EVENTS = [];
  });

  const target = await scenario.getTarget(page);
  await page.evaluate(() => window.__WB_NAV.arm());

  let hoverStartedAt = null;
  if (mode === "hover") {
    hoverStartedAt = Date.now();
    await target.hover();
    await page.waitForTimeout(HOVER_DWELL_MS);
  } else if (mode === "focus") {
    hoverStartedAt = Date.now();
    await target.focus();
    await page.waitForTimeout(HOVER_DWELL_MS);
  }

  const clickNodeAt = Date.now();
  await target.click();
  await scenario.waitUntilReady(page);
  await page.waitForTimeout(120);
  const doneNodeAt = Date.now();

  const navMarks = await page.evaluate(() => window.__WB_NAV.read());
  const debugEvents = await page.evaluate(
    () => window.__WB_PREFETCH_DEBUG_EVENTS || []
  );
  await page.evaluate(() => window.__WB_NAV.disarm());

  const preClickWindowStart =
    hoverStartedAt === null ? clickNodeAt - 1 : hoverStartedAt;
  const preClickRequests = requests.filter(
    (request) => request.ts >= preClickWindowStart && request.ts < clickNodeAt
  );
  const postClickRequests = requests.filter(
    (request) => request.ts >= clickNodeAt && request.ts <= doneNodeAt
  );

  const prefetchBeforeClick = preClickRequests.filter(isLikelyPrefetch);
  const prefetchAfterClick = postClickRequests.filter(isLikelyPrefetch);
  const preClickDebugEvents = debugEvents.filter(
    (event) => event.ts >= preClickWindowStart && event.ts < clickNodeAt
  );
  const postClickDebugEvents = debugEvents.filter(
    (event) => event.ts >= clickNodeAt && event.ts <= doneNodeAt
  );

  const result = {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    mode,
    repeatIndex,
    constrained,
    clickToRouteStartMs:
      typeof navMarks?.clickAt === "number" && typeof navMarks?.routeStartAt === "number"
        ? Number((navMarks.routeStartAt - navMarks.clickAt).toFixed(1))
        : null,
    clickToInteractiveMs: Number((doneNodeAt - clickNodeAt).toFixed(1)),
    requestCountBeforeClick: preClickRequests.length,
    requestCountAfterClick: postClickRequests.length,
    prefetchRequestCountBeforeClick: prefetchBeforeClick.length,
    prefetchRequestCountAfterClick: prefetchAfterClick.length,
    prefetchUrlsBeforeClick: [...new Set(prefetchBeforeClick.map((request) => request.url))].slice(
      0,
      8
    ),
    prefetchIntentQueuedBeforeClick: preClickDebugEvents.filter(
      (event) => event.stage === "queued"
    ).length,
    prefetchIntentStartedBeforeClick: preClickDebugEvents.filter(
      (event) => event.stage === "started"
    ).length,
    prefetchIntentSucceededBeforeClick: preClickDebugEvents.filter(
      (event) => event.stage === "succeeded"
    ).length,
    prefetchIntentEventsAfterClick: postClickDebugEvents.length,
  };

  await context.close();
  return result;
}

function summarize(results) {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.scenarioId}::${result.mode}::${result.constrained ? "constrained" : "default"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }

  const summary = [];
  for (const [key, group] of groups.entries()) {
    const [scenarioId, mode, profile] = key.split("::");
    const label = group[0]?.scenarioLabel || scenarioId;
    const clickToRouteStart = group
      .map((item) => item.clickToRouteStartMs)
      .filter((value) => typeof value === "number");
    const clickToInteractive = group
      .map((item) => item.clickToInteractiveMs)
      .filter((value) => typeof value === "number");
    const prefetchBefore = group.map((item) => item.prefetchRequestCountBeforeClick);
    const afterClickRequests = group.map((item) => item.requestCountAfterClick);
    const prefetchIntentQueuedBefore = group.map(
      (item) => item.prefetchIntentQueuedBeforeClick
    );
    const prefetchIntentStartedBefore = group.map(
      (item) => item.prefetchIntentStartedBeforeClick
    );
    const prefetchIntentSucceededBefore = group.map(
      (item) => item.prefetchIntentSucceededBeforeClick
    );

    summary.push({
      scenarioId,
      scenarioLabel: label,
      mode,
      profile,
      runs: group.length,
      clickToRouteStartAvgMs: mean(clickToRouteStart),
      clickToRouteStartP50Ms: percentile(clickToRouteStart, 50),
      clickToInteractiveAvgMs: mean(clickToInteractive),
      clickToInteractiveP50Ms: percentile(clickToInteractive, 50),
      prefetchBeforeClickAvg: mean(prefetchBefore),
      prefetchIntentQueuedBeforeClickAvg: mean(prefetchIntentQueuedBefore),
      prefetchIntentStartedBeforeClickAvg: mean(prefetchIntentStartedBefore),
      prefetchIntentSucceededBeforeClickAvg: mean(prefetchIntentSucceededBefore),
      requestCountAfterClickAvg: mean(afterClickRequests),
    });
  }
  return summary;
}

async function main() {
  const constrained = process.env.WB_PERF_CONSTRAINED === "1";
  const modes = ["none", "hover"];
  const results = [];

  const devServer = startDevServer();
  try {
    await waitForServerReady(BASE_URL, DEV_START_TIMEOUT_MS);
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });

    for (const scenario of SCENARIOS) {
      for (const mode of modes) {
        for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
          const result = await runOne({
            browser,
            scenario,
            mode,
            repeatIndex: repeat,
            constrained,
          });
          results.push(result);
          console.log(
            [
              "[perf]",
              scenario.label,
              `mode=${mode}`,
              `repeat=${repeat}`,
              `click->route=${result.clickToRouteStartMs ?? "n/a"}ms`,
              `click->ready=${result.clickToInteractiveMs}ms`,
              `prefetchBefore=${result.prefetchRequestCountBeforeClick}`,
              `requestsAfter=${result.requestCountAfterClick}`,
            ].join(" ")
          );
          await wait(250);
        }
      }
    }

    await browser.close();
  } finally {
    stopDevServer(devServer);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    repeats: REPEATS,
    constrained,
    scenarios: SCENARIOS.map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      startPath: scenario.startPath,
    })),
    results,
    summary: summarize(results),
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");
  console.log(`[perf] result written: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[perf] benchmark failed:", error);
  process.exitCode = 1;
});
