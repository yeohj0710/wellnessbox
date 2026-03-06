import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PANEL_PATH = path.resolve(process.cwd(), "app/survey/_components/SurveyResultPanel.tsx");
const SUMMARY_CARDS_PATH = path.resolve(
  process.cwd(),
  "app/survey/_components/SurveyResultSummaryCards.tsx"
);
const SUMMARY_LIB_PATH = path.resolve(process.cwd(), "app/survey/_lib/survey-result-summary.ts");

function run() {
  const checks: string[] = [];
  const panelSource = fs.readFileSync(PANEL_PATH, "utf8");
  const summaryCardsSource = fs.readFileSync(SUMMARY_CARDS_PATH, "utf8");
  const summaryLibSource = fs.readFileSync(SUMMARY_LIB_PATH, "utf8");

  assert.match(
    panelSource,
    /import \{\s*buildSurveyResultSummaryMetrics\s*\} from "@\/app\/survey\/_lib\/survey-result-summary";/,
    "SurveyResultPanel must import buildSurveyResultSummaryMetrics from survey-result-summary."
  );
  assert.match(
    panelSource,
    /import SurveyResultSummaryCards from "@\/app\/survey\/_components\/SurveyResultSummaryCards";/,
    "SurveyResultPanel must compose SurveyResultSummaryCards."
  );
  checks.push("panel_imports_summary_metrics_and_summary_cards");

  assert.ok(
    !/\{\(\(\)\s*=>\s*\{/.test(panelSource),
    "Inline IIFE render block should not remain in SurveyResultPanel."
  );
  checks.push("panel_has_no_inline_iife");

  assert.ok(
    !/function clampResultPercent\(/.test(panelSource),
    "clampResultPercent should be moved out of SurveyResultPanel."
  );
  assert.ok(
    !/function toSurveyLifestyleRiskLabel\(/.test(panelSource),
    "toSurveyLifestyleRiskLabel should be moved out of SurveyResultPanel."
  );
  assert.ok(
    !/function shouldWrapLifestyleRiskLabel\(/.test(panelSource),
    "shouldWrapLifestyleRiskLabel should be moved out of SurveyResultPanel."
  );
  checks.push("panel_no_long_summary_helpers");

  assert.match(
    summaryCardsSource,
    /import \{\s*SURVEY_RESULT_DONUT_CIRCUMFERENCE,\s*SURVEY_RESULT_DONUT_RADIUS,\s*\} from "@\/app\/survey\/_lib\/survey-result-summary";/,
    "SurveyResultSummaryCards must import donut constants from survey-result-summary."
  );
  checks.push("summary_cards_import_donut_constants");

  assert.match(
    summaryLibSource,
    /export function buildSurveyResultSummaryMetrics\(/,
    "survey-result-summary must export buildSurveyResultSummaryMetrics."
  );
  assert.match(
    summaryLibSource,
    /export \{ SURVEY_RESULT_DONUT_CIRCUMFERENCE, SURVEY_RESULT_DONUT_RADIUS \};/,
    "survey-result-summary must export donut constants used by SurveyResultPanel."
  );
  checks.push("summary_lib_exports_contract");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
