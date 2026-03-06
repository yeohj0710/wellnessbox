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
  assert.ok(
    hookSource.includes(
      "const handleRestartAuth = useEmployeeReportRestartAuthAction({"
    ),
    "Sync actions hook should expose handleRestartAuth via restart-auth subhook."
  );
  assert.ok(
    hookSource.includes("const handleSignAndSync = useEmployeeReportSignSyncAction({"),
    "Sync actions hook should expose handleSignAndSync via sign-sync subhook."
  );
  assert.ok(
    hookSource.includes("useEmployeeReportRestartAuthAction({"),
    "Sync actions hook should compose useEmployeeReportRestartAuthAction."
  );
  assert.ok(
    hookSource.includes("useEmployeeReportSignSyncAction({"),
    "Sync actions hook should compose useEmployeeReportSignSyncAction."
  );
  checks.push("hook_composes_sync_action_subhooks");

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
  checks.push("subhooks_own_restart_and_sign_sync_orchestration");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
