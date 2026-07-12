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
    async () => result.network.responses.some((entry) => entry.url.includes("/api/b2b/employee/workspace")),
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
  }

  const refreshButton = page.getByTestId("employee-report-refresh-workspace").first();
  const refreshButtonVisible = await waitFor(
    async () => (await refreshButton.count()) > 0,
    10000,
    500
  );
  result.checks.workspaceRefreshButtonVisible = refreshButtonVisible;
  if (!refreshButtonVisible) {
    pushFailure(result.failures, "workspace_refresh_button_missing", null);
    return;
  }
  result.checks.workspaceRefreshButtonDisabled = await refreshButton.isDisabled();
}

module.exports = {
  runEmployeeReportScenario,
};
