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
  const structureHookSource = readSource("app/survey/_lib/use-survey-page-structure.ts");
  const structureModelSource = readSource("app/survey/_lib/survey-page-structure-model.ts");

  assertIncludes(
    surveyPageSource,
    'from "@/app/survey/_lib/use-survey-page-structure"',
    "survey page structure hook import"
  );
  assertIncludes(
    surveyPageSource,
    'from "@/app/survey/_lib/use-survey-section-navigation"',
    "section navigation hook import"
  );
  for (const token of [
    "useSurveyPageStructure({",
    "useSurveySectionNavigation(",
  ]) {
    assertIncludes(surveyPageSource, token, `survey page helper usage ${token}`);
  }

  for (const legacyToken of [
    "const buildVisibleQuestionList = useCallback(",
    "const questionListRaw = useMemo(",
    "const autoComputedState = useMemo(",
    "const progressDoneCount = useMemo(",
    "buildPublicSurveyQuestionList(",
    "resolveAutoComputedSurveyState(",
    "buildSurveySections(",
  ]) {
    assertExcludes(
      surveyPageSource,
      legacyToken,
      `legacy inline structure token ${legacyToken}`
    );
  }

  for (const hookToken of [
    "export function useSurveyPageStructure(",
    "buildSurveyPageStructure({",
    "computeSurveyProgress({",
    "buildVisibleSurveyQuestionList({",
  ]) {
    assertIncludes(structureHookSource, hookToken, `structure hook token ${hookToken}`);
  }

  for (const modelToken of [
    "export function buildVisibleSurveyQuestionList(",
    "export function buildSurveyPageStructure(",
    "export function computeSurveyProgress(",
    "buildPublicSurveyQuestionList(",
    "resolveAutoComputedSurveyState(",
    "buildSurveySections(",
  ]) {
    assertIncludes(structureModelSource, modelToken, `structure model token ${modelToken}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "survey_page_uses_structure_hook_and_navigation_hook",
          "legacy_inline_structure_block_removed",
          "structure_hook_owns_memoized_question_and_progress_derivation",
          "structure_model_owns_pure_question_section_progress_rules",
        ],
      },
      null,
      2
    )
  );
}

run();
