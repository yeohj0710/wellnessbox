/* eslint-disable no-console */
const { chromium } = require("playwright");
const path = require("path");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  findAvailablePort,
  stopProcessTree,
} = require("./lib/dev-server.cjs");

const ROOT = process.cwd();
const TARGET_ROUTE = "/";
const BASE_PORT = Number(process.env.QA_PORT || "3110");
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "180000");

async function run() {
  const nextDevBin = resolveNextDevCommand(ROOT);
  const port = await findAvailablePort(BASE_PORT, 20);
  const baseUrl = `http://localhost:${port}`;
  const devProc = spawnNextDev({
    rootDir: ROOT,
    nextDevBin,
    port,
    env: { ...process.env, PORT: String(port) },
  });

  devProc.stdout.on("data", (chunk) => {
    process.stdout.write(`[dev] ${chunk.toString()}`);
  });
  devProc.stderr.on("data", (chunk) => {
    process.stderr.write(`[dev] ${chunk.toString()}`);
  });

  let browser;
  try {
    const ready = await waitForServerReady(baseUrl, {
      timeoutMs: START_TIMEOUT_MS,
      path: TARGET_ROUTE,
      intervalMs: 1000,
    });
    if (!ready) {
      throw new Error(`dev server ready timeout (${baseUrl})`);
    }

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const widths = [1024, 1180, 1280, 1366, 1440, 1536, 1700, 1920];
    const rows = [];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}${TARGET_ROUTE}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const header = document.querySelector("header[data-topbar-mode]");
        const nav = header?.querySelector("nav") ?? null;
        const mode = header?.getAttribute("data-topbar-mode") ?? "unknown";
        const navHeight = nav ? nav.getBoundingClientRect().height : 0;
        const navClientWidth = nav ? nav.clientWidth : 0;
        const navScrollWidth = nav ? nav.scrollWidth : 0;
        const wrappedByHeight = navHeight > 42;
        const overflowing = navScrollWidth > navClientWidth + 2;

        const navChildren = nav
          ? Array.from(nav.children).filter((node) => {
              if (!(node instanceof HTMLElement)) return false;
              return node.offsetParent !== null;
            })
          : [];
        const navChildWrapped = navChildren.some(
          (node) => node.scrollHeight > node.clientHeight + 2
        );
        const wrapped = wrappedByHeight || navChildWrapped;

        return {
          mode,
          navHeight,
          navClientWidth,
          navScrollWidth,
          wrapped,
          wrappedByHeight,
          navChildWrapped,
          overflowing,
        };
      });
      rows.push({ width, ...metrics });
    }

    console.log("\n[topbar-width-check]");
    for (const row of rows) {
      console.log(JSON.stringify(row));
    }

    const hasDesktop = rows.some((row) => row.mode === "desktop");
    const hasDrawer = rows.some((row) => row.mode === "drawer");
    if (!hasDesktop || !hasDrawer) {
      throw new Error(`mode distribution invalid (desktop=${hasDesktop}, drawer=${hasDrawer})`);
    }

    const desktopFailures = rows.filter(
      (row) => row.mode === "desktop" && (row.overflowing || row.wrapped)
    );
    if (desktopFailures.length > 0) {
      throw new Error(`desktop overflow/wrap detected: ${JSON.stringify(desktopFailures)}`);
    }

    console.log("\nTopbar responsive mode test passed.");
  } finally {
    if (browser) await browser.close();
    await stopProcessTree(devProc);
  }
}

run().catch((error) => {
  console.error("[topbar-width-check] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
