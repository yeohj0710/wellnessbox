import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-session-effects.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-session-effects"/,
    "EmployeeReportClient must import useEmployeeReportSessionEffects."
  );
  assert.ok(
    clientSource.includes("useEmployeeReportSessionEffects({"),
    "EmployeeReportClient must call useEmployeeReportSessionEffects."
  );
  checks.push("client_uses_session_effect_hook");

  assert.ok(
    !clientSource.includes("subscribeAuthSyncEvent("),
    "EmployeeReportClient should not inline subscribeAuthSyncEvent after extraction."
  );
  checks.push("client_has_no_inline_auth_sync_subscription");

  assert.match(
    hookSource,
    /export function useEmployeeReportSessionEffects\(/,
    "Session effects hook module must export useEmployeeReportSessionEffects."
  );
  assert.ok(
    hookSource.includes("subscribeAuthSyncEvent("),
    "Session effects hook should own auth-sync subscription behavior."
  );
  assert.ok(
    hookSource.includes('scopes: ["user-session", "b2b-employee-session", "nhis-link"]'),
    "Session effects hook should subscribe to every session source used by the workspace."
  );
  assert.ok(
    hookSource.includes('detail.scope === "nhis-link" && hasWorkspace'),
    "Session effects hook should refresh an active workspace after NHIS link changes."
  );
  checks.push("hook_owns_workspace_auth_sync_effects");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
