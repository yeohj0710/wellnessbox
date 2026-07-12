import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.resolve(ROOT, file), "utf8");

function run() {
  const source = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  const checks: string[] = [];

  for (const token of [
    "const applyWorkspace = useCallback(",
    "setWorkspace(next)",
    "setSelectedReportId(next?.selectedReportId ?? null)",
    "const handleStartWorkspace = useCallback(",
    "const handleRefreshWorkspace = useCallback(",
    "const handleSelectReport = useCallback(",
    "const resetIdentityFlow = useCallback(",
  ]) assert.ok(source.includes(token), `missing workspace state transition: ${token}`);
  checks.push("workspace_owns_current_state_transitions");

  assert.ok(!source.includes("setSyncNextAction("));
  assert.ok(!source.includes("setSyncGuidance("));
  assert.ok(!source.includes("setPendingSignForceRefresh("));
  checks.push("legacy_state_transitions_absent");

  assert.ok(!fs.existsSync(path.resolve(ROOT, "app/(features)/employee-report/_lib/use-employee-report-state-actions.ts")));
  checks.push("unused_legacy_hook_removed");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
