import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-auth-actions.ts");

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-auth-actions"/,
    "SurveyPageClient must import useSurveyAuthActions."
  );
  assert.ok(
    clientSource.includes("useSurveyAuthActions({"),
    "SurveyPageClient must call useSurveyAuthActions."
  );
  checks.push("client_uses_survey_auth_actions_hook");

  assert.ok(
    !clientSource.includes("async function ensureEmployeeSessionFromIdentity("),
    "SurveyPageClient should not inline ensureEmployeeSessionFromIdentity after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleStartKakaoAuth("),
    "SurveyPageClient should not inline handleStartKakaoAuth after extraction."
  );
  assert.ok(
    !clientSource.includes("async function handleConfirmKakaoAuth("),
    "SurveyPageClient should not inline handleConfirmKakaoAuth after extraction."
  );
  assert.ok(
    !clientSource.includes("requestNhisInit("),
    "SurveyPageClient should not call requestNhisInit directly after extraction."
  );
  assert.ok(
    !clientSource.includes("requestNhisSign("),
    "SurveyPageClient should not call requestNhisSign directly after extraction."
  );
  assert.ok(
    !clientSource.includes("postEmployeeSync("),
    "SurveyPageClient should not call postEmployeeSync directly after extraction."
  );
  checks.push("client_has_no_inline_auth_action_flow");

  assert.match(
    hookSource,
    /export function useSurveyAuthActions\(/,
    "Auth-actions hook should export useSurveyAuthActions."
  );
  assert.ok(
    hookSource.includes("const ensureEmployeeSessionFromIdentity = useCallback("),
    "Auth-actions hook should own ensureEmployeeSessionFromIdentity callback."
  );
  assert.ok(
    hookSource.includes("const handleStartKakaoAuth = useCallback("),
    "Auth-actions hook should own handleStartKakaoAuth callback."
  );
  assert.ok(
    hookSource.includes("const handleConfirmKakaoAuth = useCallback("),
    "Auth-actions hook should own handleConfirmKakaoAuth callback."
  );
  assert.ok(
    hookSource.includes("requestNhisInit("),
    "Auth-actions hook should own requestNhisInit usage."
  );
  assert.ok(
    hookSource.includes("requestNhisSign("),
    "Auth-actions hook should own requestNhisSign usage."
  );
  assert.ok(
    hookSource.includes("postEmployeeSync("),
    "Auth-actions hook should own postEmployeeSync usage."
  );
  checks.push("hook_owns_auth_action_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
