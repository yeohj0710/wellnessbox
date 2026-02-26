/* eslint-disable no-console */
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_EXPORT_PORT || "3112");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");
const ADMIN_PASSWORD_CANDIDATES = Array.from(
  new Set([process.env.ADMIN_PASSWORD, process.env.QA_ADMIN_PASSWORD, "0903"].filter(Boolean))
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/column`, {
        redirect: "manual",
        cache: "no-store",
      });
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // no-op
    }
    await wait(1000);
  }
  return false;
}

function resolveNextDevCommand() {
  const binName = process.platform === "win32" ? "next.cmd" : "next";
  return path.join(ROOT, "node_modules", ".bin", binName);
}

function spawnNextDev(nextDevBin, qaPort, env) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", nextDevBin, "dev", "--port", String(qaPort)], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return spawn(nextDevBin, ["dev", "--port", String(qaPort)], {
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

function compactIssue(issue) {
  return {
    code: issue.code,
    pageId: issue.pageId,
    nodeId: issue.nodeId,
    relatedNodeId: issue.relatedNodeId,
    detail: issue.detail,
  };
}

async function run() {
  if (ADMIN_PASSWORD_CANDIDATES.length === 0) {
    throw new Error("ADMIN_PASSWORD is required");
  }

  const nextDevBin = resolveNextDevCommand();
  const devProc = spawnNextDev(nextDevBin, QA_PORT, {
    ...process.env,
    PORT: String(QA_PORT),
  });

  devProc.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk.toString()}`));
  devProc.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk.toString()}`));

  const output = {
    baseUrl: BASE_URL,
    checks: {},
    failures: [],
  };

  try {
    const ready = await waitForServerReady(BASE_URL, START_TIMEOUT_MS);
    if (!ready) throw new Error("dev server ready timeout");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: BASE_URL });

    let loginStatus = null;
    let selectedPassword = null;
    for (const candidate of ADMIN_PASSWORD_CANDIDATES) {
      const loginRes = await context.request.post(`${BASE_URL}/api/verify-password`, {
        failOnStatusCode: false,
        data: { password: candidate, loginType: "admin" },
      });
      loginStatus = loginRes.status();
      if (loginStatus === 200) {
        selectedPassword = candidate;
        break;
      }
    }
    output.checks.loginStatus = loginStatus;
    output.checks.loginMatched = selectedPassword ? "yes" : "no";
    if (loginStatus !== 200) {
      output.failures.push({ key: "admin_login_failed", detail: loginStatus });
      throw new Error("admin login failed");
    }

    const seedRes = await context.request.post(`${BASE_URL}/api/admin/b2b/demo/seed`, {
      failOnStatusCode: false,
      timeout: 240000,
    });
    const seedJson = await seedRes.json().catch(() => ({}));
    const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
    output.checks.seedStatus = seedRes.status();
    output.checks.employeeId = employeeId;
    if (!employeeId) {
      output.failures.push({ key: "seed_employee_missing", detail: seedRes.status() });
      throw new Error("seed employee missing");
    }

    const detailRes = await context.request.get(`${BASE_URL}/api/admin/b2b/employees/${employeeId}`, {
      failOnStatusCode: false,
      timeout: 120000,
    });
    const detailJson = await detailRes.json().catch(() => ({}));
    const reportId = detailJson?.employee?.reports?.[0]?.id || null;
    output.checks.employeeDetailStatus = detailRes.status();
    output.checks.reportId = reportId;
    if (!reportId) {
      output.failures.push({ key: "report_id_missing", detail: detailRes.status() });
      throw new Error("report id missing");
    }

    const validationRes = await context.request.get(
      `${BASE_URL}/api/admin/b2b/reports/${reportId}/validation`,
      {
        failOnStatusCode: false,
        timeout: 240000,
      }
    );
    const validationJson = await validationRes.json().catch(() => ({}));
    output.checks.validationStatus = validationRes.status();
    output.checks.validationOk = validationJson.ok === true;
    output.checks.validationCode = validationJson.code || null;
    output.checks.validationIssueCount = Array.isArray(validationJson.issues)
      ? validationJson.issues.length
      : 0;
    output.checks.validationAudit = Array.isArray(validationJson?.audit?.validation)
      ? validationJson.audit.validation.map((row) => ({
          stage: row.stage,
          ok: row.ok,
          staticIssueCount: row.staticIssueCount,
          runtimeIssueCount: row.runtimeIssueCount,
          blockingIssueCount: row.blockingIssueCount,
        }))
      : [];
    output.checks.validationIssuePreview = Array.isArray(validationJson.issues)
      ? validationJson.issues.slice(0, 8).map(compactIssue)
      : [];

    const pptxRes = await context.request.get(
      `${BASE_URL}/api/admin/b2b/reports/${reportId}/export/pptx`,
      {
        failOnStatusCode: false,
        timeout: 240000,
      }
    );
    output.checks.exportPptxStatus = pptxRes.status();

    const pdfRes = await context.request.get(
      `${BASE_URL}/api/admin/b2b/reports/${reportId}/export/pdf`,
      {
        failOnStatusCode: false,
        timeout: 240000,
      }
    );
    output.checks.exportPdfStatus = pdfRes.status();
    output.checks.exportPdfBodySnippet = await pdfRes
      .text()
      .then((text) => text.slice(0, 320))
      .catch(() => "[binary]");

    if (output.checks.exportPptxStatus !== 200) {
      output.failures.push({
        key: "pptx_export_failed",
        detail: output.checks.exportPptxStatus,
      });
    }
    if (![200, 501].includes(output.checks.exportPdfStatus)) {
      output.failures.push({
        key: "pdf_export_failed",
        detail: output.checks.exportPdfStatus,
      });
    }

    await browser.close();
  } finally {
    await stopProcessTree(devProc);
  }

  output.ok = output.failures.length === 0;
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
