import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PANEL_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx"
);
const GUIDE_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorGuidanceCard.tsx"
);
const PROGRESS_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorProgressHeader.tsx"
);
const SELECTOR_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionSelector.tsx"
);
const PROGRESS_HELPER_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/survey-editor-progress.ts"
);

function run() {
  const checks: string[] = [];
  const panelSource = fs.readFileSync(PANEL_PATH, "utf8");
  const guideSource = fs.readFileSync(GUIDE_PATH, "utf8");
  const progressSource = fs.readFileSync(PROGRESS_PATH, "utf8");
  const selectorSource = fs.readFileSync(SELECTOR_PATH, "utf8");
  const helperSource = fs.readFileSync(PROGRESS_HELPER_PATH, "utf8");

  assert.match(
    panelSource,
    /from "\.\/B2bSurveyEditorGuidanceCard"/,
    "Panel must compose B2bSurveyEditorGuidanceCard."
  );
  assert.match(
    panelSource,
    /from "\.\/B2bSurveyEditorProgressHeader"/,
    "Panel must compose B2bSurveyEditorProgressHeader."
  );
  assert.match(
    panelSource,
    /from "\.\/B2bSurveyEditorSectionSelector"/,
    "Panel must compose B2bSurveyEditorSectionSelector."
  );
  checks.push("panel_composes_extracted_editor_components");

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
    "관리자 입력 가이드",
    "임직원 설문 입력",
    ">세부 영역 선택</h3>",
  ]) {
    assert.ok(
      !panelSource.includes(removedInlineToken),
      `Panel should not inline extracted token: ${removedInlineToken}`
    );
  }
  checks.push("panel_has_no_inline_extracted_copy");

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
    progressSource.includes("임직원 설문 입력"),
    "Progress header should own survey progress heading copy."
  );
  assert.ok(
    selectorSource.includes("세부 영역 선택"),
    "Section selector should own section heading copy."
  );
  checks.push("extracted_components_own_respective_copy");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
