/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const cardsSource = read("components/b2b/ReportSummaryCards.tsx");
  const surveyDetailModelSource = read(
    "components/b2b/report-summary/survey-detail-model.ts"
  );

  assert.ok(
    cardsSource.includes('from "./report-summary/survey-detail-model"'),
    "ReportSummaryCards should import the shared survey-detail-model"
  );
  assert.ok(
    cardsSource.includes("buildReportSummarySurveyDetailModel"),
    "ReportSummaryCards should assemble survey detail pages through the shared survey-detail-model"
  );
  assert.ok(
    cardsSource.includes("REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START"),
    "ReportSummaryCards should reuse the shared survey-detail page-start constant"
  );
  assert.ok(
    !cardsSource.includes("buildSurveyDetailPages({"),
    "ReportSummaryCards should not build survey detail pages inline after extraction"
  );
  assert.ok(
    !cardsSource.includes("const supplementDesignRows ="),
    "ReportSummaryCards should not keep supplement row assembly inline after extraction"
  );

  assert.ok(
    surveyDetailModelSource.includes("export function buildReportSummarySurveyDetailModel"),
    "survey-detail-model should own survey detail model assembly"
  );
  assert.ok(
    surveyDetailModelSource.includes("buildSurveyDetailPages({"),
    "survey-detail-model should own survey detail pagination inputs"
  );
  assert.ok(
    surveyDetailModelSource.includes("const supplementRows = buildSupplementRows"),
    "survey-detail-model should own supplement-row transformation"
  );
  assert.ok(
    surveyDetailModelSource.includes("REPORT_SUMMARY_SURVEY_DETAIL_PAGE_START"),
    "survey-detail-model should own page-start contract for downstream reuse"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_summary_cards_reuses_survey_detail_model",
          "survey_detail_model_owns_supplement_and_page_assembly",
          "survey_detail_model_exports_page_start_contract",
        ],
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b:report-summary-survey-detail-model] FAIL", error);
  process.exit(1);
}
