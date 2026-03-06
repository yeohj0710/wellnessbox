import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

function readSource(relPath: string) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

function assertIncludes(source: string, token: string, label: string) {
  assert.ok(source.includes(token), `[qa:b2b:survey-structure] missing ${label}: ${token}`);
}

function assertExcludes(source: string, token: string, label: string) {
  assert.ok(!source.includes(token), `[qa:b2b:survey-structure] unexpected ${label}: ${token}`);
}

function run() {
  const surveyPageSource = readSource("app/survey/survey-page-client.tsx");
  const helperSource = readSource("app/survey/_lib/survey-page-auto-compute.ts");

  assertIncludes(
    surveyPageSource,
    'from "@/app/survey/_lib/survey-page-auto-compute"',
    "auto-compute helper import"
  );
  assertIncludes(
    surveyPageSource,
    'from "@/app/survey/_lib/use-survey-section-navigation"',
    "section navigation hook import"
  );
  for (const token of [
    "isValidIdentityInput",
    "toIdentityPayload",
    "resolveAutoComputedSurveyState",
    "useSurveySectionNavigation(",
  ]) {
    assertIncludes(surveyPageSource, token, `survey page helper usage ${token}`);
  }

  for (const legacyToken of [
    "function resolveAutoComputedSurveyState(",
    "function resolveAutoDuplicateSurveyState(",
    "function resolveAutoDerivedBmiAnswer(",
    "function toIdentityPayload(",
    "function isValidIdentityInput(",
  ]) {
    assertExcludes(
      surveyPageSource,
      legacyToken,
      `legacy inline helper declaration ${legacyToken}`
    );
  }

  for (const helperToken of [
    "export function resolveAutoComputedSurveyState(",
    "export function toIdentityPayload(",
    "export function isValidIdentityInput(",
  ]) {
    assertIncludes(helperSource, helperToken, `helper export ${helperToken}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "survey_page_uses_auto_compute_helper_module",
          "survey_page_uses_section_navigation_hook",
          "legacy_inline_auto_compute_helpers_removed",
          "auto_compute_helper_exports_core_functions",
        ],
      },
      null,
      2
    )
  );
}

run();
