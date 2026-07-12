import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/EmployeeReportClient.tsx"
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-sync-actions.ts"
);
const RESTART_SUBHOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-restart-auth-action.ts"
);
const SIGN_SUBHOOK_PATH = path.resolve(
  process.cwd(),
  "app/(features)/employee-report/_lib/use-employee-report-sign-sync-action.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");
  const restartSubhookSource = fs.readFileSync(RESTART_SUBHOOK_PATH, "utf8");
  const signSubhookSource = fs.readFileSync(SIGN_SUBHOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\.\/_lib\/use-employee-report-sync-actions"/,
    "EmployeeReportClient must import useEmployeeReportSyncActions."
  );
  assert.ok(
    clientSource.includes("useEmployeeReportSyncActions({"),
    "EmployeeReportClient must call useEmployeeReportSyncActions."
  );
  checks.push("client_uses_sync_actions_hook");

  assert.ok(
    !clientSource.includes("async function handleRestartAuth("),
    "EmployeeReportClient should not inline handleRestartAuth after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleSignAndSync("),
    "EmployeeReportClient should not inline handleSignAndSync after extraction."
  );
  assert.ok(
    !clientSource.includes("runRestartAuthFlow("),
    "EmployeeReportClient should not call runRestartAuthFlow directly after extraction."
  );
  assert.ok(
    !clientSource.includes("runSyncFlowWithRecovery("),
    "EmployeeReportClient should not call runSyncFlowWithRecovery directly after extraction."
  );
  checks.push("client_has_no_inline_sync_action_flow");

  assert.match(
    hookSource,
    /export function useEmployeeReportSyncActions\(/,
    "Sync actions hook should export useEmployeeReportSyncActions."
  );
  assert.ok(hookSource.includes("const handleStartWorkspace = useCallback("));
  assert.ok(hookSource.includes("const handleConfirmKakaoAuth = useCallback("));
  assert.ok(hookSource.includes("startEmployeeWorkspace("));
  assert.ok(hookSource.includes("requestNhisSign("));
  checks.push("hook_owns_workspace_and_sign_actions");

  assert.match(
    restartSubhookSource,
    /export function useEmployeeReportRestartAuthAction\(/,
    "Restart-auth subhook must export useEmployeeReportRestartAuthAction."
  );
  assert.ok(
    restartSubhookSource.includes("runRestartAuthFlow("),
    "Restart-auth subhook should own runRestartAuthFlow orchestration."
  );
  assert.match(
    signSubhookSource,
    /export function useEmployeeReportSignSyncAction\(/,
    "Sign-sync subhook must export useEmployeeReportSignSyncAction."
  );
  assert.ok(
    signSubhookSource.includes("runSyncFlowWithRecovery("),
    "Sign-sync subhook should own runSyncFlowWithRecovery orchestration."
  );
  checks.push("legacy_subhooks_remain_isolated_for_legacy_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
