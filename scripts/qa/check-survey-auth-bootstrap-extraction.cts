import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(process.cwd(), "app/survey/_lib/use-survey-auth-bootstrap.ts");

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-auth-bootstrap"/,
    "SurveyPageClient must import useSurveyAuthBootstrap."
  );
  assert.ok(
    clientSource.includes("useSurveyAuthBootstrap({"),
    "SurveyPageClient must call useSurveyAuthBootstrap."
  );
  checks.push("client_uses_auth_bootstrap_hook");

  for (const token of [
    "fetchEmployeeSession(",
    "upsertEmployeeSession(",
    "subscribeAuthSyncEvent(",
    "readStoredIdentityWithSource(",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not inline auth bootstrap token after extraction: ${token}`
    );
  }
  checks.push("client_has_no_inline_auth_bootstrap_flow");

  assert.match(
    hookSource,
    /export function useSurveyAuthBootstrap\(/,
    "Auth-bootstrap hook should export useSurveyAuthBootstrap."
  );
  for (const token of [
    "fetchEmployeeSession(",
    "upsertEmployeeSession(",
    "subscribeAuthSyncEvent(",
    "readStoredIdentityWithSource(",
    'scope: "b2b-employee-session"',
    'scopes: ["b2b-employee-session", "user-session"]',
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Auth-bootstrap hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_auth_bootstrap_and_auth_sync_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
