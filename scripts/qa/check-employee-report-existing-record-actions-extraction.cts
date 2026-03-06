import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-existing-record-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-existing-record-actions"/,
    "EmployeeReportClient must import useEmployeeReportExistingRecordActions."
  );
  assert.ok(
    clientSource.includes("useEmployeeReportExistingRecordActions({"),
    "EmployeeReportClient must call useEmployeeReportExistingRecordActions."
  );
  checks.push("client_uses_existing_record_actions_hook");

  assert.ok(
    !clientSource.includes("async function handleFindExisting("),
    "EmployeeReportClient should not inline handleFindExisting after extraction."
  );
  assert.ok(
    !clientSource.includes("async function tryLoadExistingReport("),
    "EmployeeReportClient should not inline tryLoadExistingReport after extraction."
  );
  assert.ok(
    !clientSource.includes("upsertEmployeeSession("),
    "EmployeeReportClient should not call upsertEmployeeSession directly after extraction."
  );
  checks.push("client_has_no_inline_existing_record_upsert_logic");

  assert.match(
    hookSource,
    /export function useEmployeeReportExistingRecordActions\(/,
    "Existing record actions hook should export useEmployeeReportExistingRecordActions."
  );
  assert.ok(
    hookSource.includes("upsertEmployeeSession("),
    "Existing record actions hook should own upsertEmployeeSession flow."
  );
  assert.ok(
    hookSource.includes("const handleFindExisting = useCallback(async () => {"),
    "Existing record actions hook should expose handleFindExisting callback."
  );
  assert.ok(
    hookSource.includes("const tryLoadExistingReport = useCallback("),
    "Existing record actions hook should expose tryLoadExistingReport callback."
  );
  checks.push("hook_owns_existing_record_action_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
