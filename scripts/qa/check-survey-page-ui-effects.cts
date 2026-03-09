import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-page-ui-effects.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-page-ui-effects"/,
    "SurveyPageClient must import useSurveyPageUiEffects."
  );
  assert.ok(
    clientSource.includes("useSurveyPageUiEffects({"),
    "SurveyPageClient must call useSurveyPageUiEffects."
  );
  for (const token of [
    "window.dispatchEvent(new Event(\"wb:topbar-close-drawer\"))",
    "window.dispatchEvent(new Event(\"closeCart\"))",
    "if (renewalHoldTimerRef.current != null) window.clearTimeout(",
    "setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)))",
    "void refreshLoginStatus();",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline UI-effect token: ${token}`
    );
  }
  checks.push("client_uses_ui_effects_hook");

  for (const token of [
    "export function useSurveyPageUiEffects(",
    "window.dispatchEvent(new Event(\"wb:topbar-close-drawer\"))",
    "window.dispatchEvent(new Event(\"closeCart\"))",
    "window.clearTimeout(renewalHoldTimerRef.current)",
    "window.clearInterval(calcTickerRef.current)",
    "setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)))",
    "void refreshLoginStatus();",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `UI-effects hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_ui_housekeeping_effects");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
