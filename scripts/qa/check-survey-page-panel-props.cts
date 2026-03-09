import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-page-panel-props.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-page-panel-props"/,
    "SurveyPageClient must import useSurveyPagePanelProps."
  );
  assert.ok(
    clientSource.includes("useSurveyPagePanelProps({"),
    "SurveyPageClient must call useSurveyPagePanelProps."
  );
  for (const token of [
    "introBadge: TEXT.introBadge",
    "commonSection: TEXT.commonSection",
    "title={TEXT.resultTitle}",
    "submittedTitle: TEXT.submittedTitle",
    "title={TEXT.renewalTitle}",
    "title={TEXT.resetAsk}",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline panel-prop token: ${token}`
    );
  }
  checks.push("client_uses_panel_props_hook");

  for (const token of [
    "export function useSurveyPagePanelProps(",
    "introPanelProps:",
    "sectionPanelProps:",
    "calculatingPanelProps:",
    "resultPanelProps:",
    "submittedPanelProps:",
    "renewalModalProps:",
    "resetConfirmModalProps:",
    "introBadge: TEXT.introBadge",
    "commonSection: TEXT.commonSection",
    "submittedTitle: TEXT.submittedTitle",
    "title: TEXT.renewalTitle",
    "title: TEXT.resetAsk",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Panel-props hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_panel_prop_assembly");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
