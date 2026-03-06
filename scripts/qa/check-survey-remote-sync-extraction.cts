import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-remote-sync.ts");

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-remote-sync"/,
    "SurveyPageClient must import useSurveyRemoteSync."
  );
  assert.ok(
    clientSource.includes("useSurveyRemoteSync({"),
    "SurveyPageClient must call useSurveyRemoteSync."
  );
  checks.push("client_uses_survey_remote_sync_hook");

  assert.ok(
    !clientSource.includes("async function requestSurveyJson<"),
    "SurveyPageClient should not inline requestSurveyJson after extraction."
  );
  assert.ok(
    !clientSource.includes("async function persistSurveySnapshot("),
    "SurveyPageClient should not inline persistSurveySnapshot after extraction."
  );
  assert.ok(
    !clientSource.includes("requestSurveyJson<EmployeeSurveyGetResponse>("),
    "SurveyPageClient should not own remote GET sync fetch after extraction."
  );
  assert.ok(
    !clientSource.includes("requestSurveyJson<EmployeeSurveyPutResponse>("),
    "SurveyPageClient should not own remote PUT save flow after extraction."
  );
  checks.push("client_has_no_inline_remote_sync_flow");

  assert.match(
    hookSource,
    /export function useSurveyRemoteSync\(/,
    "Remote-sync hook should export useSurveyRemoteSync."
  );
  assert.ok(
    hookSource.includes("async function requestSurveyJson<"),
    "Remote-sync hook should own requestSurveyJson helper."
  );
  assert.ok(
    hookSource.includes("const persistSurveySnapshot = useCallback("),
    "Remote-sync hook should expose persistSurveySnapshot callback."
  );
  assert.ok(
    hookSource.includes('requestSurveyJson<EmployeeSurveyGetResponse>("/api/b2b/employee/survey")'),
    "Remote-sync hook should own employee survey GET fetch."
  );
  assert.ok(
    hookSource.includes('requestSurveyJson<EmployeeSurveyPutResponse>('),
    "Remote-sync hook should own employee survey PUT save."
  );
  checks.push("hook_owns_remote_sync_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
