import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-lifecycle-actions.ts");

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-lifecycle-actions"/,
    "SurveyPageClient must import useSurveyLifecycleActions."
  );
  assert.ok(
    clientSource.includes("useSurveyLifecycleActions({"),
    "SurveyPageClient must call useSurveyLifecycleActions."
  );
  checks.push("client_uses_survey_lifecycle_actions_hook");

  assert.ok(
    !clientSource.includes("function requestReset()"),
    "SurveyPageClient should not inline requestReset after extraction."
  );
  assert.ok(
    !clientSource.includes("function handleReset()"),
    "SurveyPageClient should not inline handleReset after extraction."
  );
  assert.ok(
    !clientSource.includes("function handleStartSurvey()"),
    "SurveyPageClient should not inline handleStartSurvey after extraction."
  );
  assert.ok(
    !clientSource.includes("function handleRenewalHoldStart()"),
    "SurveyPageClient should not inline handleRenewalHoldStart after extraction."
  );
  assert.ok(
    !clientSource.includes("function handleRenewalHoldEnd()"),
    "SurveyPageClient should not inline handleRenewalHoldEnd after extraction."
  );
  checks.push("client_has_no_inline_lifecycle_action_handlers");

  assert.match(
    hookSource,
    /export function useSurveyLifecycleActions\(/,
    "Lifecycle-actions hook should export useSurveyLifecycleActions."
  );
  assert.ok(
    hookSource.includes("const requestReset = useCallback("),
    "Lifecycle-actions hook should own requestReset callback."
  );
  assert.ok(
    hookSource.includes("const handleReset = useCallback("),
    "Lifecycle-actions hook should own handleReset callback."
  );
  assert.ok(
    hookSource.includes("const handleStartSurvey = useCallback("),
    "Lifecycle-actions hook should own handleStartSurvey callback."
  );
  assert.ok(
    hookSource.includes("const handleRenewalHoldStart = useCallback("),
    "Lifecycle-actions hook should own handleRenewalHoldStart callback."
  );
  assert.ok(
    hookSource.includes("const handleRenewalHoldEnd = useCallback("),
    "Lifecycle-actions hook should own handleRenewalHoldEnd callback."
  );
  checks.push("hook_owns_lifecycle_action_handlers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
