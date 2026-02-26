/* eslint-disable no-console */
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const PORT = Number(process.env.QA_CAPTURE_PORT || "3113");
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_PASSWORD_CANDIDATES = Array.from(
  new Set([process.env.ADMIN_PASSWORD, process.env.QA_ADMIN_PASSWORD, "0903"].filter(Boolean))
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveNextDevCommand() {
  const binName = process.platform === "win32" ? "next.cmd" : "next";
  return path.join(ROOT, "node_modules", ".bin", binName);
}

function spawnNextDev(nextDevBin, port, env) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", nextDevBin, "dev", "--port", String(port)], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return spawn(nextDevBin, ["dev", "--port", String(port)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function stopProcessTree(proc) {
  if (!proc || proc.killed) return Promise.resolve();
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
      return;
    }
    proc.kill("SIGTERM");
    proc.on("exit", () => resolve());
    setTimeout(() => {
      if (!proc.killed) proc.kill("SIGKILL");
      resolve();
    }, 3000);
  });
}

async function waitForServerReady(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/column`, {
        redirect: "manual",
        cache: "no-store",
      });
      if (response.status >= 200 && response.status < 500) return true;
    } catch {
      // noop
    }
    await wait(1000);
  }
  return false;
}

async function run() {
  const nextDevBin = resolveNextDevCommand();
  const devProc = spawnNextDev(nextDevBin, PORT, {
    ...process.env,
    PORT: String(PORT),
  });

  devProc.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk.toString()}`));
  devProc.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk.toString()}`));

  try {
    const ready = await waitForServerReady(BASE_URL, 150000);
    if (!ready) {
      throw new Error("dev server ready timeout");
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1536, height: 2400 },
    });
    const page = await context.newPage();

    let loginOk = false;
    for (const candidate of ADMIN_PASSWORD_CANDIDATES) {
      const loginRes = await context.request.post(`${BASE_URL}/api/verify-password`, {
        failOnStatusCode: false,
        data: { password: candidate, loginType: "admin" },
      });
      if (loginRes.status() === 200) {
        loginOk = true;
        break;
      }
    }
    if (!loginOk) {
      throw new Error("admin login failed");
    }

    const seedRes = await context.request.post(`${BASE_URL}/api/admin/b2b/demo/seed`, {
      failOnStatusCode: false,
      timeout: 240000,
    });
    const seedJson = await seedRes.json().catch(() => ({}));
    const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
    if (!employeeId) {
      throw new Error("seed employee missing");
    }

    await page.goto("/admin/b2b-reports?demo=1", { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(5000);

    const firstEmployeeButton = page.locator(`.${"listButton"}`).first();
    if ((await firstEmployeeButton.count()) > 0) {
      await firstEmployeeButton.click({ timeout: 10000 });
    } else {
      await page.locator("button").first().click({ timeout: 10000 }).catch(() => {});
    }

    await page.waitForTimeout(7000);

    const out = path.join(ROOT, "tmp", "admin-b2b-reports-selected-v4.png");
    await page.screenshot({ path: out, fullPage: true });

    await browser.close();

    console.log(
      JSON.stringify(
        {
          ok: true,
          screenshot: out,
        },
        null,
        2
      )
    );
  } finally {
    await stopProcessTree(devProc);
  }
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
