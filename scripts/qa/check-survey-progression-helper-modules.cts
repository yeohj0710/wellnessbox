import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOOK_PATH = path.join(ROOT, "app/survey/_lib/use-survey-progression-actions.ts");
const HELPER_PATH = path.join(ROOT, "app/survey/_lib/survey-progression-helpers.ts");

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const hookSource = read(HOOK_PATH);
  const helperSource = read(HELPER_PATH);
  const checks: string[] = [];

  assert.match(
    hookSource,
    /from "\.\/survey-progression-helpers"/,
    "Progression actions hook must import survey progression helpers."
  );
  checks.push("hook_imports_progression_helpers");

  for (const token of [
    "function hasSameSectionSelection(",
    "getFocusedIndex(",
    "const effectiveQuestionList = buildVisibleQuestionList(",
  ]) {
    assert.ok(
      !hookSource.includes(token),
      `Progression hook should not inline helper token after extraction: ${token}`
    );
  }
  checks.push("hook_keeps_helper_logic_out");

  for (const token of [
    "export function hasSameSectionSelection(",
    "export function resolveCurrentSectionQuestionContext(",
    "export function buildEffectiveSurveyStructure(",
    "export function findSectionValidationIssue(",
  ]) {
    assert.ok(
      helperSource.includes(token),
      `Progression helper module must own token: ${token}`
    );
  }
  checks.push("helper_module_owns_pure_progression_rules");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
