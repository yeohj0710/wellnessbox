import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-page-persistence-effects.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-page-persistence-effects"/,
    "SurveyPageClient must import useSurveyPagePersistenceEffects."
  );
  assert.ok(
    clientSource.includes("useSurveyPagePersistenceEffects({"),
    "SurveyPageClient must call useSurveyPagePersistenceEffects."
  );
  for (const token of [
    "restorePersistedSurveyState({",
    "createPersistedSurveyState({",
    "window.localStorage.setItem(STORAGE_KEY",
    "window.localStorage.removeItem(STORAGE_KEY",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline persistence token: ${token}`
    );
  }
  checks.push("client_uses_persistence_effects_hook");

  for (const token of [
    "export function useSurveyPagePersistenceEffects(",
    "restorePersistedSurveyState({",
    "createPersistedSurveyState({",
    "window.localStorage.setItem(storageKey",
    "window.localStorage.removeItem(storageKey",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Persistence-effects hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_restore_and_snapshot_persistence");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
