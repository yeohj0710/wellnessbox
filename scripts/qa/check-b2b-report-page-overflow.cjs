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
const { buildAdminPasswordCandidates, loginAdmin } = require("./lib/column-admin-api.cjs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_REPORT_OVERFLOW_PORT || "3116");
const BASE_URL = process.env.BASE_URL || `http://localhost:${QA_PORT}`;
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");
const TARGET_NAME = (process.env.QA_REPORT_TARGET_NAME || "권혁찬").trim();
const MAX_EMPLOYEES = Number(process.env.QA_REPORT_OVERFLOW_MAX_EMPLOYEES || "5");
const OVERFLOW_TOLERANCE_PX = Number(process.env.QA_REPORT_OVERFLOW_TOLERANCE_PX || "2");
const REQUIRE_TARGET =
  String(process.env.QA_REPORT_OVERFLOW_REQUIRE_TARGET || "").trim() === "1";
const REPORT_WIDTHS = String(process.env.QA_REPORT_OVERFLOW_WIDTHS || "960,1080,1200")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 800 && value <= 1400);

function pushFailure(output, key, detail) {
  output.failures.push({ key, detail });
}

function uniqueById(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row || !row.id) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function fetchEmployees(context, baseUrl, queryText = "") {
  const suffix = queryText ? `?q=${encodeURIComponent(queryText)}` : "";
  const response = await context.request.get(`${baseUrl}/api/admin/b2b/employees${suffix}`, {
    failOnStatusCode: false,
    timeout: 120000,
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    employees: Array.isArray(body?.employees) ? body.employees : [],
  };
}

async function seedDemoEmployee(context, baseUrl) {
  const response = await context.request.post(`${baseUrl}/api/admin/b2b/demo/seed`, {
    failOnStatusCode: false,
    timeout: 240000,
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    employeeIds: Array.isArray(body?.employeeIds) ? body.employeeIds : [],
  };
}

async function fetchEmployeeDetail(context, baseUrl, employeeId) {
  const response = await context.request.get(`${baseUrl}/api/admin/b2b/employees/${employeeId}`, {
    failOnStatusCode: false,
    timeout: 120000,
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    employee: body?.employee ?? null,
  };
}

async function regenerateReport(context, baseUrl, employeeId, periodKey) {
  const response = await context.request.post(`${baseUrl}/api/admin/b2b/employees/${employeeId}/report`, {
    failOnStatusCode: false,
    timeout: 240000,
    data: {
      regenerate: true,
      periodKey: periodKey || undefined,
      pageSize: "A4",
    },
  });
  return {
    status: response.status(),
  };
}

async function ensureReportId(context, baseUrl, employeeId) {
  const firstDetail = await fetchEmployeeDetail(context, baseUrl, employeeId);
  const firstReportId = firstDetail.employee?.reports?.[0]?.id || null;
  const periodKey = firstDetail.employee?.periodKey || null;
  if (firstReportId) {
    return {
      status: firstDetail.status,
      reportId: firstReportId,
      periodKey,
      employeeName: firstDetail.employee?.name || null,
    };
  }

  const regenerate = await regenerateReport(context, baseUrl, employeeId, periodKey);
  if (regenerate.status !== 200) {
    return {
      status: regenerate.status,
      reportId: null,
      periodKey,
      employeeName: firstDetail.employee?.name || null,
    };
  }

  const nextDetail = await fetchEmployeeDetail(context, baseUrl, employeeId);
  return {
    status: nextDetail.status,
    reportId: nextDetail.employee?.reports?.[0]?.id || null,
    periodKey: nextDetail.employee?.periodKey || periodKey,
    employeeName: nextDetail.employee?.name || firstDetail.employee?.name || null,
  };
}

async function waitForReportPages(page) {
  await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page="1"]', {
    timeout: 120000,
  });
  await page.waitForSelector('[data-testid="report-capture-surface"] [data-report-page]', {
    timeout: 120000,
  });
  await page.waitForTimeout(220);
  await page.evaluate(async () => {
    if ("fonts" in document) {
      try {
        await document.fonts.ready;
      } catch {
        // no-op
      }
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function inspectPageOverflow(page, tolerancePx) {
  return page.evaluate((tolerance) => {
    function hasScrollableAncestor(node, root) {
      let parent = node.parentElement;
      while (parent && parent !== root) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY || "";
        const overflow = style.overflow || "";
        if (
          overflowY.includes("auto") ||
          overflowY.includes("scroll") ||
          overflow.includes("auto") ||
          overflow.includes("scroll")
        ) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    const pages = Array.from(
      document.querySelectorAll('[data-testid="report-capture-surface"] [data-report-page]')
    );

    return pages.map((pageNode, index) => {
      if (!(pageNode instanceof HTMLElement)) {
        return {
          page: index + 1,
          hasOverflow: true,
          reason: "invalid_page_node",
        };
      }

      const pageRect = pageNode.getBoundingClientRect();
      const scrollOverflowPx = Math.max(0, pageNode.scrollHeight - pageNode.clientHeight);
      let childOverflowPx = 0;
      let sampleNode = null;

      const descendants = pageNode.querySelectorAll("*");
      for (const node of descendants) {
        if (!(node instanceof HTMLElement)) continue;
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = node.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        if (hasScrollableAncestor(node, pageNode)) continue;
        const overflowPx = rect.bottom - pageRect.bottom;
        if (overflowPx > childOverflowPx) {
          childOverflowPx = overflowPx;
          sampleNode = {
            tag: node.tagName,
            text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
          };
        }
      }

      return {
        page: Number(pageNode.getAttribute("data-report-page") || index + 1),
        clientHeight: pageNode.clientHeight,
        scrollHeight: pageNode.scrollHeight,
        scrollOverflowPx: Number(scrollOverflowPx.toFixed(2)),
        childOverflowPx: Number(Math.max(0, childOverflowPx).toFixed(2)),
        sampleNode,
        hasOverflow:
          scrollOverflowPx > tolerance || Math.max(0, childOverflowPx) > tolerance,
      };
    });
  }, tolerancePx);
}

async function runCase(input) {
  const { context, baseUrl, employee, reportId, reportWidth, output, employeeLabel } = input;
  const page = await context.newPage({
    viewport: { width: 1600, height: 1400 },
  });

  const caseKey = `${employee.id}:${reportWidth}`;
  const url = `${baseUrl}/admin/b2b-reports/export-view/${reportId}?w=${reportWidth}`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    await waitForReportPages(page);
    const pageChecks = await inspectPageOverflow(page, OVERFLOW_TOLERANCE_PX);
    const overflowPages = pageChecks.filter((row) => row.hasOverflow);

    output.checks.caseResults.push({
      caseKey,
      employeeId: employee.id,
      employeeName: employeeLabel,
      reportWidth,
      pageChecks,
    });

    if (overflowPages.length > 0) {
      pushFailure(output, "report_page_overflow_detected", {
        caseKey,
        employeeId: employee.id,
        employeeName: employeeLabel,
        reportWidth,
        overflowPages,
      });
    }
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function run() {
  const adminPasswordCandidates = buildAdminPasswordCandidates(process.env);
  if (adminPasswordCandidates.length === 0) {
    throw new Error("ADMIN_PASSWORD is required");
  }

  const releaseQaLock = await acquireQaLock({
    lockName: "qa-dev-server",
    owner: "qa:b2b:report-overflow",
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
    checks: {
      targetName: TARGET_NAME,
      targetFound: false,
      reportWidths: REPORT_WIDTHS,
      caseResults: [],
    },
    failures: [],
  };

  let browser = null;
  try {
    const ready = await waitForServerReady(BASE_URL, {
      path: "/column",
      timeoutMs: START_TIMEOUT_MS,
    });
    if (!ready) throw new Error("dev server ready timeout");

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: BASE_URL });

    const login = await loginAdmin(BASE_URL, context, adminPasswordCandidates);
    output.checks.loginStatus = login.status;
    if (login.status !== 200) {
      pushFailure(output, "admin_login_failed", login.status);
      throw new Error("admin login failed");
    }

    const [targetEmployeesResult, latestEmployeesResult] = await Promise.all([
      fetchEmployees(context, BASE_URL, TARGET_NAME),
      fetchEmployees(context, BASE_URL, ""),
    ]);
    output.checks.targetQueryStatus = targetEmployeesResult.status;
    output.checks.latestQueryStatus = latestEmployeesResult.status;

    let employees = uniqueById([
      ...targetEmployeesResult.employees,
      ...latestEmployeesResult.employees,
    ]).slice(0, Math.max(1, MAX_EMPLOYEES));

    if (targetEmployeesResult.employees.length > 0) {
      output.checks.targetFound = true;
    } else if (REQUIRE_TARGET) {
      pushFailure(output, "target_employee_not_found", {
        targetName: TARGET_NAME,
      });
    }

    if (employees.length === 0) {
      const seedResult = await seedDemoEmployee(context, BASE_URL);
      output.checks.seedStatus = seedResult.status;
      output.checks.seedEmployeeCount = seedResult.employeeIds.length;
      if (seedResult.employeeIds.length > 0) {
        const seedDetails = await Promise.all(
          seedResult.employeeIds.map((employeeId) => fetchEmployeeDetail(context, BASE_URL, employeeId))
        );
        employees = uniqueById(
          seedDetails
            .map((detail) => detail.employee)
            .filter((row) => row && row.id)
        ).slice(0, Math.max(1, MAX_EMPLOYEES));
      }
    }

    if (employees.length === 0) {
      pushFailure(output, "employee_pool_empty", "no employees available for overflow check");
      throw new Error("employee pool empty");
    }

    output.checks.employeePool = employees.map((employee) => ({
      id: employee.id,
      name: employee.name || null,
      updatedAt: employee.updatedAt || null,
    }));

    for (const employee of employees) {
      const reportLookup = await ensureReportId(context, BASE_URL, employee.id);
      if (!reportLookup.reportId) {
        pushFailure(output, "report_missing_for_employee", {
          employeeId: employee.id,
          employeeName: employee.name || null,
          status: reportLookup.status,
        });
        continue;
      }

      const employeeLabel = reportLookup.employeeName || employee.name || "-";
      for (const reportWidth of REPORT_WIDTHS) {
        await runCase({
          context,
          baseUrl: BASE_URL,
          employee,
          reportId: reportLookup.reportId,
          reportWidth,
          output,
          employeeLabel,
        });
      }
    }
  } finally {
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
