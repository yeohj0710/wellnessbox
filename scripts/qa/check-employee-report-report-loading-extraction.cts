import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-report-loading.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-report-loading"/,
    "EmployeeReportClient must import useEmployeeReportReportLoading."
  );
  assert.ok(
    clientSource.includes("useEmployeeReportReportLoading({"),
    "EmployeeReportClient must call useEmployeeReportReportLoading."
  );
  checks.push("client_uses_report_loading_hook");

  assert.ok(
    !clientSource.includes("fetchEmployeeWorkspace("),
    "EmployeeReportClient should not call the workspace endpoint directly after extraction."
  );
  checks.push("client_has_no_inline_report_loading_flow");

  assert.match(
    hookSource,
    /export function useEmployeeReportReportLoading\(/,
    "Report loading hook should export useEmployeeReportReportLoading."
  );
  assert.ok(
    hookSource.includes("const loadWorkspace = useCallback("),
    "Report loading hook should expose loadWorkspace callback."
  );
  assert.ok(
    hookSource.includes("const applyWorkspace = useCallback("),
    "Report loading hook should own workspace state application."
  );
  assert.ok(
    hookSource.includes("fetchEmployeeWorkspace("),
    "Report loading hook should own fetchEmployeeWorkspace flow."
  );
  assert.ok(
    hookSource.includes("setPolling(next?.sync?.active === true)"),
    "Report loading hook should synchronize polling state from workspace state."
  );
  checks.push("hook_owns_report_loading_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
