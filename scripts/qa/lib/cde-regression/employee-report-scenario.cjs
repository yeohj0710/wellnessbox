async function runEmployeeReportScenario(input) {
  const { page, context, baseUrl, result, pushFailure, waitFor } = input;

  await page.goto("/admin/b2b-reports?demo=1", { waitUntil: "networkidle", timeout: 120000 });
  const seedRes = await context.request.post(`${baseUrl}/api/admin/b2b/demo/seed`, {
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
    employeeRes = await context.request.get(`${baseUrl}/api/admin/b2b/employees/${employeeId}`, {
      failOnStatusCode: false,
      timeout: 120000,
    });
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

  const sessionLoginRes = await context.request.post(`${baseUrl}/api/b2b/employee/session`, {
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
    async () => result.network.responses.some((entry) => entry.url.includes("/api/b2b/employee/report")),
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
    const beforePdfRequestCount = result.network.requests.length;
    await pdfButton.click();
    await waitFor(
      async () =>
        result.network.responses.some((entry) =>
          entry.url.includes("/api/b2b/employee/report/export/pdf")
        ) ||
        result.network.requests.some((entry) =>
          entry.url.includes("/api/b2b/employee/report/export/pdf")
        ),
      8000
    );
    const employeePdfCallsAfterClick = result.network.responses
      .slice(beforePdfResponseCount)
      .filter((entry) => entry.url.includes("/api/b2b/employee/report/export/pdf"));
    const employeePdfRequestsAfterClick = result.network.requests
      .slice(beforePdfRequestCount)
      .filter((entry) => entry.url.includes("/api/b2b/employee/report/export/pdf"));
    const employeePdfCallsTotal = result.network.responses.filter((entry) =>
      entry.url.includes("/api/b2b/employee/report/export/pdf")
    );
    const employeePdfRequestsTotal = result.network.requests.filter((entry) =>
      entry.url.includes("/api/b2b/employee/report/export/pdf")
    );
    result.checks.employeePdfCallsAfterClick = employeePdfCallsAfterClick.length;
    result.checks.employeePdfRequestsAfterClick = employeePdfRequestsAfterClick.length;
    result.checks.employeePdfCalls = employeePdfCallsTotal.length;
    result.checks.employeePdfRequests = employeePdfRequestsTotal.length;
    result.checks.employeePdfExportMode =
      employeePdfCallsTotal.length > 0 || employeePdfRequestsTotal.length > 0
        ? "api"
        : "client-capture-or-untracked";
  } else {
    result.checks.employeePdfCalls = 0;
    result.checks.employeePdfCallsAfterClick = 0;
    result.checks.employeePdfExportMode = "button-unavailable";
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
    return;
  }

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
  if (forceButtonDisabled) return;

  await forceButton.click();
  const forceDialogVisible = await waitFor(
    async () => (await page.getByTestId("employee-report-force-sync-dialog").count()) > 0,
    5000
  );
  result.checks.forceRefreshDialogVisible = forceDialogVisible;
  if (!forceDialogVisible) {
    pushFailure(result.failures, "force_refresh_dialog_missing", null);
    return;
  }

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

module.exports = {
  runEmployeeReportScenario,
};
