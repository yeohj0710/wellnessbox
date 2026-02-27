const { loginAdmin } = require("../column-admin-api.cjs");

function compactIssue(issue) {
  return {
    code: issue.code,
    pageId: issue.pageId,
    nodeId: issue.nodeId,
    relatedNodeId: issue.relatedNodeId,
    detail: issue.detail,
  };
}

function pushFailure(output, key, detail) {
  output.failures.push({ key, detail });
}

async function runB2bExportSmokeScenario(input) {
  const { context, baseUrl, adminPasswordCandidates, output } = input;

  const login = await loginAdmin(baseUrl, context, adminPasswordCandidates);
  const loginStatus = login.status;
  const selectedPassword = login.selectedPassword;
  output.checks.loginStatus = loginStatus;
  output.checks.loginMatched = selectedPassword ? "yes" : "no";
  if (loginStatus !== 200) {
    pushFailure(output, "admin_login_failed", loginStatus);
    throw new Error("admin login failed");
  }

  const seedRes = await context.request.post(`${baseUrl}/api/admin/b2b/demo/seed`, {
    failOnStatusCode: false,
    timeout: 240000,
  });
  const seedJson = await seedRes.json().catch(() => ({}));
  const employeeId = Array.isArray(seedJson.employeeIds) ? seedJson.employeeIds[0] : null;
  output.checks.seedStatus = seedRes.status();
  output.checks.employeeId = employeeId;
  if (!employeeId) {
    pushFailure(output, "seed_employee_missing", seedRes.status());
    throw new Error("seed employee missing");
  }

  const detailRes = await context.request.get(`${baseUrl}/api/admin/b2b/employees/${employeeId}`, {
    failOnStatusCode: false,
    timeout: 120000,
  });
  const detailJson = await detailRes.json().catch(() => ({}));
  const reportId = detailJson?.employee?.reports?.[0]?.id || null;
  output.checks.employeeDetailStatus = detailRes.status();
  output.checks.reportId = reportId;
  if (!reportId) {
    pushFailure(output, "report_id_missing", detailRes.status());
    throw new Error("report id missing");
  }

  const validationRes = await context.request.get(
    `${baseUrl}/api/admin/b2b/reports/${reportId}/validation`,
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
    `${baseUrl}/api/admin/b2b/reports/${reportId}/export/pptx`,
    {
      failOnStatusCode: false,
      timeout: 240000,
    }
  );
  output.checks.exportPptxStatus = pptxRes.status();

  const pdfRes = await context.request.get(`${baseUrl}/api/admin/b2b/reports/${reportId}/export/pdf`, {
    failOnStatusCode: false,
    timeout: 240000,
  });
  output.checks.exportPdfStatus = pdfRes.status();
  output.checks.exportPdfBodySnippet = await pdfRes
    .text()
    .then((text) => text.slice(0, 320))
    .catch(() => "[binary]");

  if (output.checks.exportPptxStatus !== 200) {
    pushFailure(output, "pptx_export_failed", output.checks.exportPptxStatus);
  }
  if (![200, 501].includes(output.checks.exportPdfStatus)) {
    pushFailure(output, "pdf_export_failed", output.checks.exportPdfStatus);
  }
}

module.exports = {
  runB2bExportSmokeScenario,
};
