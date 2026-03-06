import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-session-bootstrap.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-session-bootstrap"/,
    "EmployeeReportClient must import useEmployeeReportSessionBootstrap."
  );
  assert.ok(
    clientSource.includes("const checkSessionAndMaybeAutoLogin = useEmployeeReportSessionBootstrap({"),
    "EmployeeReportClient must resolve bootstrap callback via useEmployeeReportSessionBootstrap."
  );
  checks.push("client_uses_session_bootstrap_hook");

  assert.ok(
    !clientSource.includes("async function checkSessionAndMaybeAutoLogin("),
    "EmployeeReportClient should not inline async checkSessionAndMaybeAutoLogin after extraction."
  );
  assert.ok(
    !clientSource.includes("fetchEmployeeSession("),
    "EmployeeReportClient should not call fetchEmployeeSession directly after extraction."
  );
  assert.ok(
    !clientSource.includes("readStoredIdentityWithSource("),
    "EmployeeReportClient should not read stored identity directly after extraction."
  );
  checks.push("client_has_no_inline_bootstrap_session_logic");

  assert.match(
    hookSource,
    /export function useEmployeeReportSessionBootstrap\(/,
    "Hook module must export useEmployeeReportSessionBootstrap."
  );
  assert.ok(
    hookSource.includes("fetchEmployeeSession("),
    "Session bootstrap hook should own fetchEmployeeSession flow."
  );
  assert.ok(
    hookSource.includes("readStoredIdentityWithSource("),
    "Session bootstrap hook should own stored identity read flow."
  );
  checks.push("hook_owns_session_bootstrap_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
