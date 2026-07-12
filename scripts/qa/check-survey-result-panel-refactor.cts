import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PANEL_PATH = path.resolve(process.cwd(), "app/survey/_components/SurveyResultPanel.tsx");
const SUMMARY_CARDS_PATH = path.resolve(
  process.cwd(),
  "app/survey/_components/SurveyResultSummaryCards.tsx"
);
const ACTION_SECTION_PATH = path.resolve(
  process.cwd(),
  "app/survey/_components/SurveyResultActionSection.tsx"
);
const SUMMARY_LIB_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/survey-result-summary.ts"
);
const B2B_PREVIEW_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bIntegratedResultPreview.tsx"
);
const B2B_HEALTH_PATH = path.resolve(process.cwd(), "app/(admin)/admin/b2b-reports/_components/B2bIntegratedHealthMetricsSection.tsx");
const B2B_MEDICATION_PATH = path.resolve(process.cwd(), "app/(admin)/admin/b2b-reports/_components/B2bIntegratedMedicationReviewSection.tsx");
const B2B_MODEL_PATH = path.resolve(process.cwd(), "app/(admin)/admin/b2b-reports/_lib/b2b-integrated-result-preview-model.ts");

function run() {
  const checks: string[] = [];
  const panelSource = fs.readFileSync(PANEL_PATH, "utf8");
  const summaryCardsSource = fs.readFileSync(SUMMARY_CARDS_PATH, "utf8");
  const actionSectionSource = fs.readFileSync(ACTION_SECTION_PATH, "utf8");
  const summaryLibSource = fs.readFileSync(SUMMARY_LIB_PATH, "utf8");
  const b2bPreviewSource = fs.readFileSync(B2B_PREVIEW_PATH, "utf8");
  const b2bHealthSource = fs.readFileSync(B2B_HEALTH_PATH, "utf8");
  const b2bMedicationSource = fs.readFileSync(B2B_MEDICATION_PATH, "utf8");
  const b2bModelSource = fs.readFileSync(B2B_MODEL_PATH, "utf8");

  assert.ok(
    panelSource.includes("import SurveyResultActionSection") &&
      panelSource.includes("import SurveyResultSummaryCards"),
    "SurveyResultPanel must compose extracted summary cards and action section."
  );
  checks.push("panel_composes_extracted_components");

  for (const token of [
    "주의가 필요한 문항 요약",
    "영역별 분석 코멘트",
    "맞춤 영양제 설계",
    "내 답변:",
  ]) {
    assert.ok(
      panelSource.includes(token),
      `[qa:survey:result-panel-refactor] missing panel text token: ${token}`
    );
  }
  checks.push("panel_uses_korean_result_copy_tokens");

  for (const token of ["건강점수 원형 차트", "생활습관 위험도 레이더 그래프", "건강관리 위험도"]) {
    assert.ok(
      summaryCardsSource.includes(token),
      `[qa:survey:result-panel-refactor] missing summary cards token: ${token}`
    );
  }
  checks.push("summary_cards_own_chart_and_risk_card_markup");

  for (const token of ["다음 단계", "결과를 확인하고 답안을 다시 조정할 수 있습니다."]) {
    assert.ok(
      actionSectionSource.includes(token),
      `[qa:survey:result-panel-refactor] missing action section token: ${token}`
    );
  }
  checks.push("action_section_uses_korean_navigation_copy");

  for (const token of ["식습관 위험도", "활동량 위험도", "면역관리 위험도", "수면 위험도"]) {
    assert.ok(
      summaryLibSource.includes(token),
      `[qa:survey:result-panel-refactor] missing summary lib label token: ${token}`
    );
  }
  checks.push("summary_lib_uses_expected_lifestyle_labels");

  assert.ok(b2bPreviewSource.includes("B2bIntegratedHealthMetricsSection"));
  assert.ok(b2bHealthSource.includes("건강검진 데이터 상세"));
  assert.ok(b2bMedicationSource.includes("복약 이력"));
  assert.ok(b2bModelSource.includes("설문 결과") && b2bModelSource.includes("생활습관 위험도"));
  checks.push("b2b_preview_uses_clean_korean_copy");

  const mojibakeLikePatterns = ["�", "??/span>", "analysis_failed"];
  for (const source of [
    panelSource,
    summaryCardsSource,
    actionSectionSource,
    summaryLibSource,
    b2bPreviewSource,
    b2bHealthSource,
    b2bMedicationSource,
    b2bModelSource,
  ]) {
    for (const marker of mojibakeLikePatterns) {
      assert.ok(
        !source.includes(marker),
        `[qa:survey:result-panel-refactor] mojibake-like marker detected: ${marker}`
      );
    }
  }
  checks.push("target_files_have_no_known_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
