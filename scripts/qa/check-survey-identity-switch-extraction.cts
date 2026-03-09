import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-identity-switch.ts"
);
const RESET_HELPER_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/survey-state-reset.ts"
);
const LIFECYCLE_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-lifecycle-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");
  const resetHelperSource = fs.readFileSync(RESET_HELPER_PATH, "utf8");
  const lifecycleSource = fs.readFileSync(LIFECYCLE_HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-identity-switch"/,
    "SurveyPageClient must import useSurveyIdentitySwitch."
  );
  assert.ok(
    clientSource.includes("useSurveyIdentitySwitch({"),
    "SurveyPageClient must call useSurveyIdentitySwitch."
  );
  assert.ok(
    !clientSource.includes("async function handleSwitchIdentity("),
    "SurveyPageClient should not inline handleSwitchIdentity after extraction."
  );
  checks.push("client_uses_identity_switch_hook");

  for (const token of [
    "export function useSurveyIdentitySwitch(",
    "const handleSwitchIdentity = useCallback(",
    "deleteEmployeeSession()",
    "clearStoredIdentity()",
    "emitAuthSyncEvent({",
    "resetSurveyFlowState({",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Identity-switch hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_identity_switch_flow");

  assert.ok(
    resetHelperSource.includes("export function resetSurveyFlowState("),
    "survey-state-reset should export resetSurveyFlowState."
  );
  assert.ok(
    lifecycleSource.includes("resetSurveyFlowState({"),
    "Lifecycle hook should reuse resetSurveyFlowState."
  );
  checks.push("reset_helper_reused_by_lifecycle");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
