import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const NAV_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-survey-editor-navigation.ts"
);
const NAV_HELPER_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/survey-editor-navigation-helpers.ts"
);
const SCROLLER_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/use-survey-editor-question-scroller.ts"
);

function run() {
  const checks: string[] = [];
  const hookSource = fs.readFileSync(NAV_HOOK_PATH, "utf8");
  const helperSource = fs.readFileSync(NAV_HELPER_PATH, "utf8");
  const scrollerSource = fs.readFileSync(SCROLLER_HOOK_PATH, "utf8");

  assert.match(
    hookSource,
    /from "\.\/survey-editor-navigation-helpers"/,
    "use-survey-editor-navigation must import survey-editor-navigation-helpers."
  );
  for (const helperCall of [
    "clampSectionIndex(",
    "resolveSectionFocusQuestionKey(",
    "findCurrentQuestionIndex(",
    "validateQuestionAnswerForNavigation(",
    "findFirstInvalidQuestionInSection(",
  ]) {
    assert.ok(
      hookSource.includes(helperCall),
      `[qa:b2b:admin-survey-editor-navigation-extraction] missing helper call: ${helperCall}`
    );
  }
  checks.push("navigation_hook_uses_extracted_helpers");

  assert.ok(
    !hookSource.includes("validateSurveyQuestionAnswer("),
    "validateSurveyQuestionAnswer should not be called directly in navigation hook after extraction."
  );
  checks.push("navigation_hook_has_no_direct_validation_engine_call");

  assert.match(
    hookSource,
    /from "\.\/use-survey-editor-question-scroller"/,
    "use-survey-editor-navigation must import use-survey-editor-question-scroller."
  );
  assert.ok(
    !hookSource.includes("window.requestAnimationFrame("),
    "Scrolling DOM implementation should be owned by use-survey-editor-question-scroller."
  );
  checks.push("navigation_hook_delegates_scroller_dom_logic");

  for (const helperExport of [
    "export function clampSectionIndex(",
    "export function resolveSectionFocusQuestionKey(",
    "export function findCurrentQuestionIndex(",
    "export function validateQuestionAnswerForNavigation(",
    "export function findFirstInvalidQuestionInSection(",
  ]) {
    assert.ok(
      helperSource.includes(helperExport),
      `[qa:b2b:admin-survey-editor-navigation-extraction] missing helper export: ${helperExport}`
    );
  }
  checks.push("navigation_helper_exports_core_pure_functions");

  assert.match(
    scrollerSource,
    /export function useSurveyEditorQuestionScroller\(\)/,
    "Scroller hook should export useSurveyEditorQuestionScroller."
  );
  assert.ok(
    scrollerSource.includes("window.requestAnimationFrame("),
    "Scroller hook should own window.requestAnimationFrame logic."
  );
  checks.push("scroller_hook_owns_scroll_dom_behavior");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
