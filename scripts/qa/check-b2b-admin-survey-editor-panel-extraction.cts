import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const PANEL_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx"
);
const GUIDE_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorGuidanceCard.tsx"
);
const PROGRESS_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorProgressHeader.tsx"
);
const SELECTOR_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionSelector.tsx"
);
const TABS_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionTabs.tsx"
);
const QUESTION_LIST_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorQuestionList.tsx"
);
const ACTIONS_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorActions.tsx"
);
const PROGRESS_HELPER_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_lib/survey-editor-progress.ts"
);

const MOJIBAKE_MARKER_REGEX = /\?[가-힣]|�/;

function run() {
  const checks: string[] = [];
  const panelSource = fs.readFileSync(PANEL_PATH, "utf8");
  const guideSource = fs.readFileSync(GUIDE_PATH, "utf8");
  const progressSource = fs.readFileSync(PROGRESS_PATH, "utf8");
  const selectorSource = fs.readFileSync(SELECTOR_PATH, "utf8");
  const tabsSource = fs.readFileSync(TABS_PATH, "utf8");
  const questionListSource = fs.readFileSync(QUESTION_LIST_PATH, "utf8");
  const actionsSource = fs.readFileSync(ACTIONS_PATH, "utf8");
  const helperSource = fs.readFileSync(PROGRESS_HELPER_PATH, "utf8");

  for (const importToken of [
    'from "./B2bSurveyEditorGuidanceCard"',
    'from "./B2bSurveyEditorProgressHeader"',
    'from "./B2bSurveyEditorSectionSelector"',
    'from "./B2bSurveyEditorSectionTabs"',
    'from "./B2bSurveyEditorQuestionList"',
    'from "./B2bSurveyEditorActions"',
  ]) {
    assert.match(
      panelSource,
      new RegExp(importToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Panel must compose ${importToken}.`
    );
  }
  checks.push("panel_composes_editor_subsections");

  assert.match(
    panelSource,
    /from "\.\.\/_lib\/survey-editor-progress"/,
    "Panel must import survey-editor-progress helpers."
  );
  for (const helperCall of [
    "resolveRecommendedSectionSelectionText(",
    "computeSurveyEditorEffectiveProgressPercent(",
    "computeSurveyEditorProgressDoneCount(",
  ]) {
    assert.ok(
      panelSource.includes(helperCall),
      `[qa:b2b:admin-survey-editor-panel-extraction] missing helper call: ${helperCall}`
    );
  }
  checks.push("panel_uses_shared_progress_helpers");

  for (const removedInlineToken of [
    "<nav className=\"flex flex-wrap gap-2\">",
    "currentSection.questions.map((question) => {",
    "이전 섹션",
    "다음 섹션",
    "설문 저장",
  ]) {
    assert.ok(
      !panelSource.includes(removedInlineToken),
      `Panel should not inline extracted token: ${removedInlineToken}`
    );
  }
  checks.push("panel_has_no_inline_section_tabs_question_list_or_actions");

  for (const helperExport of [
    "export function resolveRecommendedSectionSelectionText(",
    "export function computeSurveyEditorEffectiveProgressPercent(",
    "export function computeSurveyEditorProgressDoneCount(",
  ]) {
    assert.ok(
      helperSource.includes(helperExport),
      `[qa:b2b:admin-survey-editor-panel-extraction] missing helper export: ${helperExport}`
    );
  }
  checks.push("progress_helper_exports_required_functions");

  assert.ok(
    guideSource.includes("관리자 입력 가이드"),
    "Guidance card should own guide heading copy."
  );
  assert.ok(
    progressSource.includes("현재 설문 입력"),
    "Progress header should own survey progress heading copy."
  );
  assert.ok(
    selectorSource.includes("세부 영역 선택"),
    "Section selector should own section heading copy."
  );
  assert.ok(
    tabsSource.includes("onMoveToSection"),
    "Section tabs should own section tab button rendering."
  );
  assert.ok(
    questionListSource.includes("SurveyQuestionField"),
    "Question list should own question field rendering."
  );
  assert.ok(
    actionsSource.includes("설문 저장"),
    "Actions component should own footer action copy."
  );
  checks.push("extracted_components_own_respective_markup");

  for (const [source, label] of [
    [panelSource, "B2bSurveyEditorPanel.tsx"],
    [guideSource, "B2bSurveyEditorGuidanceCard.tsx"],
    [progressSource, "B2bSurveyEditorProgressHeader.tsx"],
    [selectorSource, "B2bSurveyEditorSectionSelector.tsx"],
    [tabsSource, "B2bSurveyEditorSectionTabs.tsx"],
    [questionListSource, "B2bSurveyEditorQuestionList.tsx"],
    [actionsSource, "B2bSurveyEditorActions.tsx"],
  ] as const) {
    assert.ok(
      !MOJIBAKE_MARKER_REGEX.test(source),
      `[qa:b2b:admin-survey-editor-panel-extraction] possible mojibake marker found in ${label}`
    );
  }
  checks.push("editor_panel_modules_have_no_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
