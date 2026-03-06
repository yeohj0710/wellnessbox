import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-report-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-report-actions"/,
    "EmployeeReportClient must import useEmployeeReportReportActions."
  );
  assert.ok(
    clientSource.includes("useEmployeeReportReportActions({"),
    "EmployeeReportClient must call useEmployeeReportReportActions."
  );
  checks.push("client_uses_report_actions_hook");

  assert.ok(
    !clientSource.includes("async function handleDownloadPdf("),
    "EmployeeReportClient should not inline handleDownloadPdf after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleDownloadLegacyPdf("),
    "EmployeeReportClient should not inline handleDownloadLegacyPdf after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleLogout("),
    "EmployeeReportClient should not inline handleLogout after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleChangePeriod("),
    "EmployeeReportClient should not inline handleChangePeriod after extraction."
  );
  assert.ok(
    !clientSource.includes("downloadEmployeeReportPdf("),
    "EmployeeReportClient should not directly call downloadEmployeeReportPdf after extraction."
  );
  assert.ok(
    !clientSource.includes("downloadEmployeeReportLegacyPdf("),
    "EmployeeReportClient should not directly call downloadEmployeeReportLegacyPdf after extraction."
  );
  assert.ok(
    !clientSource.includes("requestNhisUnlink("),
    "EmployeeReportClient should not directly call requestNhisUnlink after extraction."
  );
  checks.push("client_has_no_inline_report_actions");

  assert.match(
    hookSource,
    /export function useEmployeeReportReportActions\(/,
    "Report actions hook should export useEmployeeReportReportActions."
  );
  assert.ok(
    hookSource.includes("const handleDownloadPdf = useCallback(async () => {"),
    "Report actions hook should expose handleDownloadPdf callback."
  );
  assert.ok(
    hookSource.includes("const handleDownloadLegacyPdf = useCallback(async () => {"),
    "Report actions hook should expose handleDownloadLegacyPdf callback."
  );
  assert.ok(
    hookSource.includes("const handleLogout = useCallback(async () => {"),
    "Report actions hook should expose handleLogout callback."
  );
  assert.ok(
    hookSource.includes("const handleChangePeriod = useCallback("),
    "Report actions hook should expose handleChangePeriod callback."
  );
  assert.ok(
    hookSource.includes("downloadEmployeeReportPdf("),
    "Report actions hook should own downloadEmployeeReportPdf flow."
  );
  assert.ok(
    hookSource.includes("downloadEmployeeReportLegacyPdf("),
    "Report actions hook should own downloadEmployeeReportLegacyPdf flow."
  );
  assert.ok(
    hookSource.includes("requestNhisUnlink("),
    "Report actions hook should own requestNhisUnlink flow."
  );
  checks.push("hook_owns_report_actions_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
