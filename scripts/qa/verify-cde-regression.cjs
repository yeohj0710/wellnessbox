/* eslint-disable no-console */
const { chromium } = require("playwright");
const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const ADMIN_PASSWORD_CANDIDATES = Array.from(
  new Set([process.env.ADMIN_PASSWORD, process.env.QA_ADMIN_PASSWORD, "0903"].filter(Boolean))
);

function pushFailure(failures, key, detail) {
  failures.push({ key, detail });
}

async function waitFor(condition, timeoutMs, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await condition();
    if (value) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function run() {
  if (ADMIN_PASSWORD_CANDIDATES.length === 0) {
    throw new Error("ADMIN_PASSWORD is required for qa:cde:regression");
  }

  const result = {
    baseUrl: BASE_URL,
    checks: {},
    network: {
      requests: [],
      responses: [],
    },
    failures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes("/api/health/nhis/init") ||
      url.includes("/api/health/nhis/sign") ||
      url.includes("/api/b2b/employee/sync") ||
      url.includes("/api/b2b/employee/report") ||
      url.includes("/api/b2b/employee/report/export/pdf") ||
      url.includes("/api/admin/b2b/reports/")
    ) {
      result.network.requests.push({
        url,
        method: request.method(),
        postData: request.postData() || null,
      });
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("/_next/static/chunks/app/layout.js") ||
      url.includes("/api/health/nhis/init") ||
      url.includes("/api/health/nhis/sign") ||
      url.includes("/api/b2b/employee/sync") ||
      url.includes("/api/b2b/employee/report") ||
      url.includes("/api/b2b/employee/report/export/pdf") ||
      url.includes("/api/admin/b2b/reports/")
    ) {
      let body = "";
      try {
        const contentType = (response.headers()["content-type"] || "").toLowerCase();
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          body = await response.text();
          if (body.length > 400) body = `${body.slice(0, 400)}...`;
        } else {
          body = `[binary:${contentType || "unknown"}]`;
        }
      } catch {
        body = "[unreadable]";
      }
      result.network.responses.push({
        url,
        status: response.status(),
        body,
      });
    }
  });

  try {
    // C1: column chunk and tag rendering
    const columnRes = await page.goto("/column", {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    result.checks.columnStatus = columnRes?.status() ?? null;
    if (columnRes?.status() !== 200) {
      pushFailure(result.failures, "column_status", columnRes?.status() ?? null);
    }

    const chunkOk = await waitFor(async () => {
      return result.network.responses.some(
        (entry) =>
          entry.url.includes("/_next/static/chunks/app/layout.js") &&
          entry.status === 200
      );
    }, 15000);
    result.checks.layoutChunk200 = chunkOk;
    if (!chunkOk) {
      pushFailure(result.failures, "layout_chunk_200_missing", null);
    }

    const tagRes = await page.goto(
      "/column/tag/%ED%95%9C%EA%B8%80-%ED%83%9C%EA%B7%B8-%EC%97%86%EC%9D%8C-%EA%B2%80%EC%A6%9D",
      { waitUntil: "networkidle", timeout: 120000 }
    );
    result.checks.tagStatus = tagRes?.status() ?? null;
    if (tagRes?.status() !== 200) {
      pushFailure(result.failures, "column_tag_status", tagRes?.status() ?? null);
    }

    // Login admin (prefer API login to avoid locale/path drift)
    let apiLoginRes = null;
    let selectedPassword = null;
    const loginAttempts = [];
    for (const candidate of ADMIN_PASSWORD_CANDIDATES) {
      const response = await context.request.post(`${BASE_URL}/api/verify-password`, {
        failOnStatusCode: false,
        data: {
          password: candidate,
          loginType: "admin",
        },
      });
      loginAttempts.push(response.status());
      if (response.status() === 200) {
        apiLoginRes = response;
        selectedPassword = candidate;
        break;
      }
      if (!apiLoginRes) {
        apiLoginRes = response;
      }
    }

    result.checks.adminLoginApiStatus = apiLoginRes?.status() ?? null;
    result.checks.adminLoginApiAttempts = loginAttempts;
    result.checks.adminLoginPasswordSelected = selectedPassword ? "matched" : "none";

    if (apiLoginRes?.status() === 200) {
      await page.goto("/column", { waitUntil: "networkidle", timeout: 120000 });
      result.checks.adminLoginFlow = "api_verify_password";
    } else {
      const loginBody = await apiLoginRes?.text().catch(() => "");
      result.checks.adminLoginApiBody = loginBody.slice(0, 240);

      await page.goto(`/admin-login?redirect=${encodeURIComponent("/column")}`, {
        waitUntil: "networkidle",
        timeout: 120000,
      });
      const passwordInput = page.locator("input[type='password']");
      const loginFormReady = await passwordInput
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (loginFormReady) {
        await passwordInput.fill(ADMIN_PASSWORD_CANDIDATES[0]);
        await page.locator("form button[type='submit']").click();
        await page.waitForURL("**/column", { timeout: 120000 });
        result.checks.adminLoginFlow = "form_submit_fallback";
      } else {
        const currentUrl = page.url();
        const alreadyOnColumn = currentUrl.includes("/column");
        result.checks.adminLoginFlow = alreadyOnColumn
          ? "already_authenticated"
          : "missing_login_form";
        if (!alreadyOnColumn) {
          pushFailure(result.failures, "admin_login_missing", {
            currentUrl,
            apiStatus: apiLoginRes?.status() ?? null,
          });
          throw new Error("admin_login_missing");
        }
      }
    }

    const hasColumnMenu = (await page.locator("a[href='/column']").count()) > 0;
    const hasWriteMenu = (await page.locator("a[href='/admin/column/editor']").count()) > 0;
    result.checks.menuColumn = hasColumnMenu;
    result.checks.menuWrite = hasWriteMenu;
    if (!hasColumnMenu) pushFailure(result.failures, "menu_column_missing", null);
    if (!hasWriteMenu) pushFailure(result.failures, "menu_write_missing", null);

    // C2 CRUD smoke
    await page.goto("/admin/column/editor", { waitUntil: "networkidle", timeout: 120000 });
    const title = `qa-auto-${Date.now()}`;
    const titleField = page.getByTestId("column-editor-title");
    const titleFieldReady = await titleField
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!titleFieldReady) {
      pushFailure(result.failures, "column_editor_title_missing", {
        url: page.url(),
        loginFlow: result.checks.adminLoginFlow,
        loginApiStatus: result.checks.adminLoginApiStatus,
      });
      throw new Error("column_editor_title_missing");
    }
    await titleField.fill(title);

    const tagsField = page.getByTestId("column-editor-tags");
    const tagsFieldReady = await tagsField
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!tagsFieldReady) {
      pushFailure(result.failures, "column_editor_tags_missing", {
        url: page.url(),
      });
      throw new Error("column_editor_tags_missing");
    }
    await tagsField.fill("QA,auto");

    const contentField = page.getByTestId("column-editor-content");
    const contentFieldReady = await contentField
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!contentFieldReady) {
      pushFailure(result.failures, "column_editor_content_missing", {
        url: page.url(),
      });
      throw new Error("column_editor_content_missing");
    }
    await contentField.fill("## QA auto body");

    await page.getByTestId("column-editor-save-draft").click();
    await page.waitForTimeout(1000);

    let post = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const listRes = await context.request.get(
        `${BASE_URL}/api/admin/column/posts?status=all&q=${encodeURIComponent(title)}`,
        { failOnStatusCode: false }
      );
      const listJson = await listRes.json().catch(() => ({}));
      post = Array.isArray(listJson.posts)
        ? listJson.posts.find((item) => item.title === title)
        : null;
      if (post) break;
      await page.waitForTimeout(800);
    }
    const postId = post?.id || null;
    if (!postId) {
      pushFailure(result.failures, "column_created_post_not_found", null);
      throw new Error("column_created_post_not_found");
    }

    await page.getByTestId("column-editor-publish").click();
    await page.waitForTimeout(1000);

    const detailRes = await context.request.get(`${BASE_URL}/api/admin/column/posts/${postId}`, {
      failOnStatusCode: false,
    });
    const detailJson = await detailRes.json().catch(() => ({}));
    const slug = detailJson?.post?.slug || post?.slug || null;
    if (!slug) {
      pushFailure(result.failures, "column_created_slug_not_found", postId);
      throw new Error("column_created_slug_not_found");
    }

    await page.goto("/column", { waitUntil: "networkidle", timeout: 120000 });
    const card = page.locator("[data-testid='column-card']").filter({ hasText: title }).first();
    const cardFound = await waitFor(async () => (await card.count()) > 0, 6000, 300);
    result.checks.columnCardFound = cardFound;

    const canDeleteFromList = cardFound
      ? (await card.getByTestId("column-admin-delete-open").count()) > 0
      : false;
    result.checks.columnListDeleteAction = canDeleteFromList;

    await page.goto(`/column/${encodeURIComponent(slug)}`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    const detailDeleteButton = page.getByTestId("column-admin-delete-open");
    if ((await detailDeleteButton.count()) === 0) {
      pushFailure(result.failures, "column_detail_delete_missing", slug);
    } else {
      await detailDeleteButton.click();
      await page.getByTestId("column-admin-delete-confirm-input").fill("\uC0AD\uC81C");
      await page.getByTestId("column-admin-delete-confirm-submit").click();
      await page.waitForURL("**/column", { timeout: 120000 });
    }

    const deletedRes = await context.request.get(`${BASE_URL}/api/admin/column/posts/${postId}`, {
      failOnStatusCode: false,
    });
    result.checks.deletedDetailStatus = deletedRes.status();
    if (deletedRes.status() !== 404) {
      pushFailure(result.failures, "column_delete_not_applied", deletedRes.status());
    }

    // D/E smoke
    await page.goto("/admin/b2b-reports?demo=1", { waitUntil: "networkidle", timeout: 120000 });
    const seedRes = await context.request.post(`${BASE_URL}/api/admin/b2b/demo/seed`, {
      failOnStatusCode: false,
      timeout: 180000,
    });
    const seedJson = await seedRes.json().catch(() => ({}));
    const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
    if (!employeeId) {
      pushFailure(result.failures, "b2b_seed_employee_missing", seedRes.status());
      throw new Error("b2b_seed_employee_missing");
    }

    let employeeRes = null;
    let employeeJson = {};
    for (let attempt = 0; attempt < 4; attempt += 1) {
      employeeRes = await context.request.get(
        `${BASE_URL}/api/admin/b2b/employees/${employeeId}`,
        {
          failOnStatusCode: false,
          timeout: 120000,
        }
      );
      employeeJson = await employeeRes.json().catch(() => ({}));
      const hasIdentity =
        typeof employeeJson?.employee?.name === "string" &&
        typeof employeeJson?.employee?.birthDate === "string" &&
        typeof employeeJson?.employee?.phoneNormalized !== "undefined";
      if (employeeRes.status() < 500 && hasIdentity) break;
      await page.waitForTimeout(1200);
    }
    const employee = employeeJson?.employee;
    if (!employee?.name || !employee?.birthDate || !employee?.phoneNormalized) {
      pushFailure(result.failures, "b2b_employee_identity_missing", {
        status: employeeRes?.status() ?? null,
      });
      throw new Error("b2b_employee_identity_missing");
    }

    const sessionLoginRes = await context.request.post(`${BASE_URL}/api/b2b/employee/session`, {
      data: {
        name: employee.name,
        birthDate: employee.birthDate,
        phone: String(employee.phoneNormalized).replace(/\D/g, ""),
      },
      failOnStatusCode: false,
      headers: { "Content-Type": "application/json" },
    });
    result.checks.employeeSessionLogin = sessionLoginRes.status();
    if (sessionLoginRes.status() !== 200) {
      pushFailure(result.failures, "employee_session_login_failed", sessionLoginRes.status());
    }

    await page.goto("/employee-report?debug=1", { waitUntil: "networkidle", timeout: 120000 });
    await waitFor(
      async () =>
        result.network.responses.some((entry) =>
          entry.url.includes("/api/b2b/employee/report")
        ),
      20000
    );

    const summaryVisible = await waitFor(
      async () => (await page.getByTestId("employee-report-summary-section").count()) > 0,
      20000,
      500
    );
    result.checks.employeeSummaryVisible = summaryVisible;
    if (!summaryVisible) {
      pushFailure(result.failures, "employee_summary_missing", {
        currentUrl: page.url(),
      });
    }
    const pdfButton = page.getByTestId("employee-report-download-pdf").first();
    if ((await pdfButton.count()) > 0 && !(await pdfButton.isDisabled())) {
      const beforePdfResponseCount = result.network.responses.length;
      await pdfButton.click();
      await waitFor(
        async () =>
          result.network.responses.some((entry) =>
            entry.url.includes("/api/b2b/employee/report/export/pdf")
          ),
        8000
      );
      const employeePdfCallsAfterClick = result.network.responses
        .slice(beforePdfResponseCount)
        .filter((entry) => entry.url.includes("/api/b2b/employee/report/export/pdf"));
      const employeePdfCallsTotal = result.network.responses.filter((entry) =>
        entry.url.includes("/api/b2b/employee/report/export/pdf")
      );
      result.checks.employeePdfCallsAfterClick = employeePdfCallsAfterClick.length;
      result.checks.employeePdfCalls = employeePdfCallsTotal.length;
      if (employeePdfCallsTotal.length === 0) {
        pushFailure(result.failures, "employee_pdf_call_missing", null);
      }
    } else {
      result.checks.employeePdfCalls = 0;
      result.checks.employeePdfCallsAfterClick = 0;
    }

    const restartButton = page.getByTestId("employee-report-restart-auth").first();
    const restartVisible = await waitFor(
      async () => (await restartButton.count()) > 0,
      10000,
      500
    );
    result.checks.restartButtonVisible = restartVisible;
    if (!restartVisible) {
      pushFailure(result.failures, "restart_button_missing", null);
    } else {
      const beforeReq = result.network.requests.length;
      await restartButton.click();
      await page.waitForTimeout(5000);
      const initRequest = result.network.requests
        .slice(beforeReq)
        .find((entry) => entry.url.includes("/api/health/nhis/init"));
      result.checks.restartInitRequested = Boolean(initRequest);
      result.checks.restartInitPayload = initRequest?.postData || null;
      if (!initRequest) {
        pushFailure(result.failures, "restart_init_not_called", null);
      }
    }

    const forceButtonVisible = await waitFor(
      async () => (await page.getByTestId("employee-report-force-sync-open").count()) > 0,
      10000,
      500
    );
    result.checks.forceRefreshButtonVisible = forceButtonVisible;
    if (!forceButtonVisible) {
      pushFailure(result.failures, "force_refresh_button_missing", null);
    } else {
      const forcePanel = page.getByTestId("employee-report-force-sync-panel").first();
      const forcePanelSummary = page.getByTestId("employee-report-force-sync-summary").first();
      if ((await forcePanel.count()) > 0 && !(await forcePanel.isVisible())) {
        if ((await forcePanelSummary.count()) > 0) {
          await forcePanelSummary.click();
          await page.waitForTimeout(250);
        }
      }
      const forceButton = page.getByTestId("employee-report-force-sync-open").first();
      if (!(await forceButton.isVisible()) && (await forcePanelSummary.count()) > 0) {
        await forcePanelSummary.click();
        await page.waitForTimeout(250);
      }
      const forceButtonDisabled = await forceButton.isDisabled();
      result.checks.forceRefreshButtonDisabled = forceButtonDisabled;
      if (!forceButtonDisabled) {
        await forceButton.click();
        const forceDialogVisible = await waitFor(
          async () =>
            (await page.getByTestId("employee-report-force-sync-dialog").count()) > 0,
          5000
        );
        result.checks.forceRefreshDialogVisible = forceDialogVisible;
        if (!forceDialogVisible) {
          pushFailure(result.failures, "force_refresh_dialog_missing", null);
        } else {
          const forceDialogHasCheckbox =
            (await page.getByTestId("employee-report-force-sync-checkbox").count()) > 0;
          const forceDialogHasInput =
            (await page.getByTestId("employee-report-force-sync-input").count()) > 0;
          const forceDialogHasConfirm =
            (await page.getByTestId("employee-report-force-sync-confirm").count()) > 0;
          result.checks.forceRefreshDialogHasCheckbox = forceDialogHasCheckbox;
          result.checks.forceRefreshDialogHasInput = forceDialogHasInput;
          result.checks.forceRefreshDialogHasConfirm = forceDialogHasConfirm;
          if (!forceDialogHasCheckbox || !forceDialogHasInput || !forceDialogHasConfirm) {
            pushFailure(result.failures, "force_refresh_dialog_controls_missing", {
              forceDialogHasCheckbox,
              forceDialogHasInput,
              forceDialogHasConfirm,
            });
          }
          await page.getByTestId("employee-report-force-sync-cancel").click();
        }
      }
    }
  } finally {
    await browser.close();
  }

  result.ok = result.failures.length === 0;
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

run().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
