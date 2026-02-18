const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const LABEL = process.env.MEASURE_LABEL || "manual";
const OUTPUT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "perf",
  "navigation-prefetch"
);
const OUTPUT_PATH = path.join(OUTPUT_DIR, `${LABEL}.json`);

const DEFAULT_VIEWPORT = { width: 1600, height: 1000 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSameOriginRequest(urlString) {
  try {
    const requestUrl = new URL(urlString);
    return requestUrl.origin === new URL(BASE_URL).origin;
  } catch {
    return false;
  }
}

function isRscLike(urlString) {
  if (!urlString) return false;
  return urlString.includes("_rsc=") || urlString.includes("__nextDataReq");
}

function isPrefetchLike(headers) {
  if (!headers) return false;
  const purpose = headers.purpose || headers["sec-purpose"];
  return (
    purpose === "prefetch" ||
    headers["next-router-prefetch"] === "1" ||
    headers["x-nextjs-prefetch"] === "1"
  );
}

async function waitForHomeProductsInteractive(page) {
  await page.waitForSelector("#home-products", { timeout: 30000 });
  try {
    await page.waitForFunction(
      () => {
        const el = document.getElementById("home-products");
        if (!el) return false;
        return el.getAttribute("data-filter-updating") !== "true";
      },
      { timeout: 6000 }
    );
  } catch {
    // Keep baseline/after measurement resilient when product data load is slow.
  }
}

async function gotoAndReady(page, pathName) {
  await page.goto(`${BASE_URL}${pathName}`, { waitUntil: "domcontentloaded" });

  if (pathName === "/" || pathName.startsWith("/?") || pathName === "/explore") {
    await waitForHomeProductsInteractive(page);
    return;
  }

  if (pathName === "/chat") {
    await page.waitForSelector("textarea", { timeout: 30000 });
    return;
  }

  if (pathName === "/me") {
    await page.waitForSelector("main, body", { timeout: 30000 });
    return;
  }

  await page.waitForLoadState("domcontentloaded");
}

async function findRankingCardButtonIndex(page) {
  const index = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll("button"));
    for (let i = 0; i < allButtons.length; i += 1) {
      const button = allButtons[i];
      const hasBadge = Array.from(button.querySelectorAll("span")).some((span) =>
        /^#\d+$/.test((span.textContent || "").trim())
      );
      if (!hasBadge) continue;
      const hasParagraph = button.querySelector("p") !== null;
      if (!hasParagraph) continue;
      return i;
    }
    return -1;
  });

  if (index < 0) {
    throw new Error("Could not find ranking product card button");
  }

  return index;
}

async function collectScenario(page, options) {
  const {
    name,
    sourcePath,
    withHover,
    clickSelector,
    urlWaiter,
    readyWaiter,
    clickByIndex,
  } = options;

  await gotoAndReady(page, sourcePath);
  console.log(`[measure] scenario=${name} mode=${withHover ? "hover" : "click"} source=${sourcePath}`);
  await sleep(200);

  const startUrl = page.url();

  let target = null;
  if (typeof clickByIndex === "number") {
    target = page.locator("button").nth(clickByIndex);
  } else {
    target = page.locator(clickSelector).first();
  }

  if ((await target.count()) === 0) {
    return {
      scenario: name,
      mode: withHover ? "hover_then_click" : "click_only",
      skipped: true,
      reason: `target not found: ${clickSelector || `button[${clickByIndex}]`}`,
    };
  }

  await target.scrollIntoViewIfNeeded();

  const requests = [];
  let tracking = false;
  let trackingStartedAt = 0;

  const handleRequest = (req) => {
    if (!tracking) return;
    const requestUrl = req.url();
    if (!isSameOriginRequest(requestUrl)) return;
    requests.push({
      atMs: Date.now() - trackingStartedAt,
      url: requestUrl,
      method: req.method(),
      resourceType: req.resourceType(),
      isRsc: isRscLike(requestUrl),
      isPrefetch: isPrefetchLike(req.headers()),
    });
  };

  page.on("request", handleRequest);

  try {
    tracking = true;
    trackingStartedAt = Date.now();

    if (withHover) {
      await target.hover({ force: true });
      await sleep(250);
    }

    const clickStartedAt = Date.now();
    const clickRelMs = clickStartedAt - trackingStartedAt;

    await target.click({ force: true });

    await urlWaiter(page, startUrl);
    const routeChangedAt = Date.now();

    await readyWaiter(page);
    await sleep(150);

    const doneAt = Date.now();

    const requestsBeforeClick = requests.filter((req) => req.atMs <= clickRelMs);
    const requestsAfterClick = requests.filter((req) => req.atMs > clickRelMs);

    return {
      scenario: name,
      mode: withHover ? "hover_then_click" : "click_only",
      skipped: false,
      from: sourcePath,
      to: page.url(),
      clickToRouteChangeMs: routeChangedAt - clickStartedAt,
      clickToInteractiveMs: doneAt - clickStartedAt,
      requestCounts: {
        beforeClick: requestsBeforeClick.length,
        beforeClickPrefetchLike: requestsBeforeClick.filter((req) => req.isPrefetch).length,
        beforeClickRscLike: requestsBeforeClick.filter((req) => req.isRsc).length,
        afterClick: requestsAfterClick.length,
        afterClickPrefetchLike: requestsAfterClick.filter((req) => req.isPrefetch).length,
        afterClickRscLike: requestsAfterClick.filter((req) => req.isRsc).length,
      },
      sampleRequests: requests.slice(0, 20),
    };
  } finally {
    tracking = false;
    page.off("request", handleRequest);
    console.log(`[measure] done scenario=${name} mode=${withHover ? "hover" : "click"}`);
  }
}

async function measure() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: DEFAULT_VIEWPORT });
  const page = await context.newPage();

  const results = [];

  const runBothModes = async (scenario) => {
    results.push(
      await collectScenario(page, {
        ...scenario,
        withHover: false,
      })
    );
    results.push(
      await collectScenario(page, {
        ...scenario,
        withHover: true,
      })
    );
  };

  await runBothModes({
    name: "home_to_explore",
    sourcePath: "/",
    clickSelector: 'a[href="/explore"]',
    urlWaiter: (p) => p.waitForURL((url) => url.pathname === "/explore", { timeout: 30000 }),
    readyWaiter: (p) => waitForHomeProductsInteractive(p),
  });

  const homeProductCardIndex = await (async () => {
    await gotoAndReady(page, "/");
    return findRankingCardButtonIndex(page);
  })();

  await runBothModes({
    name: "home_to_product_detail",
    sourcePath: "/",
    clickByIndex: homeProductCardIndex,
    urlWaiter: (p) =>
      p.waitForURL((url) => url.pathname === "/" && url.searchParams.has("product"), {
        timeout: 30000,
      }),
    readyWaiter: (p) =>
      p.waitForSelector("div.z-20.fixed.inset-0.bg-white", {
        timeout: 30000,
      }),
  });

  const exploreProductCardIndex = await (async () => {
    await gotoAndReady(page, "/explore");
    return findRankingCardButtonIndex(page);
  })();

  await runBothModes({
    name: "explore_to_product_detail",
    sourcePath: "/explore",
    clickByIndex: exploreProductCardIndex,
    urlWaiter: (p) =>
      p.waitForURL(
        (url) => url.pathname === "/explore" && url.searchParams.has("product"),
        { timeout: 30000 }
      ),
    readyWaiter: (p) =>
      p.waitForSelector("div.z-20.fixed.inset-0.bg-white", {
        timeout: 30000,
      }),
  });

  await runBothModes({
    name: "home_to_chat",
    sourcePath: "/",
    clickSelector: 'a[href="/chat"]',
    urlWaiter: (p) => p.waitForURL((url) => url.pathname === "/chat", { timeout: 30000 }),
    readyWaiter: (p) => p.waitForSelector("textarea", { timeout: 30000 }),
  });

  const myPageLinkPresent = await (async () => {
    await gotoAndReady(page, "/");
    return (await page.locator('a[href="/me"]').count()) > 0;
  })();

  if (myPageLinkPresent) {
    await runBothModes({
      name: "home_to_me",
      sourcePath: "/",
      clickSelector: 'a[href="/me"]',
      urlWaiter: (p) => p.waitForURL((url) => url.pathname === "/me", { timeout: 30000 }),
      readyWaiter: (p) => p.waitForSelector("main, body", { timeout: 30000 }),
    });
  } else {
    results.push({
      scenario: "home_to_me",
      mode: "click_only",
      skipped: true,
      reason: "home menu does not expose /me link in current session",
    });
    results.push({
      scenario: "home_to_me",
      mode: "hover_then_click",
      skipped: true,
      reason: "home menu does not expose /me link in current session",
    });
  }

  await browser.close();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const report = {
    label: LABEL,
    baseUrl: BASE_URL,
    capturedAt: new Date().toISOString(),
    viewport: DEFAULT_VIEWPORT,
    results,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf-8");

  const summary = results
    .filter((entry) => !entry.skipped)
    .map((entry) => {
      return [
        entry.scenario,
        entry.mode,
        `${entry.clickToRouteChangeMs}ms`,
        `${entry.clickToInteractiveMs}ms`,
        `${entry.requestCounts.beforeClick}/${entry.requestCounts.afterClick}`,
      ].join("\t");
    });

  console.log(`Saved: ${OUTPUT_PATH}`);
  console.log("scenario\tmode\tclick_to_route_change\tclick_to_interactive\trequests(before/after)");
  for (const line of summary) {
    console.log(line);
  }
}

measure().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
