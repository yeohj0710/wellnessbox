import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.resolve(ROOT, file), "utf8");

function run() {
  const source = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  const loading = read("app/(features)/employee-report/_lib/use-employee-report-report-loading.ts");
  const syncActions = read("app/(features)/employee-report/_lib/use-employee-report-sync-actions.ts");
  const reportActions = read("app/(features)/employee-report/_lib/use-employee-report-report-actions.ts");
  const recordActions = read("app/(features)/employee-report/_lib/use-employee-report-existing-record-actions.ts");
  const checks: string[] = [];

  for (const [owner, token] of [
    [loading, "const applyWorkspace = useCallback("],
    [loading, "setWorkspace(next)"],
    [loading, "setSelectedReportId(next?.selectedReportId ?? null)"],
    [syncActions, "const handleStartWorkspace = useCallback("],
    [reportActions, "const handleRefreshWorkspace = useCallback("],
    [reportActions, "const handleSelectReport = useCallback("],
    [recordActions, "const resetIdentityFlow = useCallback("],
  ] as const) assert.ok(owner.includes(token), `missing workspace state transition: ${token}`);
  for (const token of [
    "useEmployeeReportReportLoading",
    "useEmployeeReportSyncActions",
    "useEmployeeReportReportActions",
    "useEmployeeReportExistingRecordActions",
  ]) assert.ok(source.includes(token), `client missing action hook: ${token}`);
  checks.push("hooks_own_current_state_transitions");

  assert.ok(!source.includes("setSyncNextAction("));
  assert.ok(!source.includes("setSyncGuidance("));
  assert.ok(!source.includes("setPendingSignForceRefresh("));
  checks.push("legacy_state_transitions_absent");

  assert.ok(!fs.existsSync(path.resolve(ROOT, "app/(features)/employee-report/_lib/use-employee-report-state-actions.ts")));
  checks.push("unused_legacy_hook_removed");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
