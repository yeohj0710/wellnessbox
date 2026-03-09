/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const pagesSource = read("components/b2b/report-summary/SurveyDetailPages.tsx");
  const groupsSource = read("components/b2b/report-summary/survey-detail-groups.ts");

  assert.ok(
    pagesSource.includes('from "./survey-detail-groups"'),
    "SurveyDetailPages should import grouping helpers from survey-detail-groups"
  );
  assert.ok(
    pagesSource.includes("groupSectionAdviceRows(page.sectionAdviceRows)"),
    "SurveyDetailPages should group section advice through survey-detail-groups"
  );
  assert.ok(
    !pagesSource.includes("function normalizeSectionAdviceLine"),
    "SurveyDetailPages should not keep section-advice normalization internals after extraction"
  );
  assert.ok(
    !pagesSource.includes("function groupSectionAdviceRows"),
    "SurveyDetailPages should not keep section-advice grouping internals after extraction"
  );

  assert.ok(
    groupsSource.includes("export function groupSectionAdviceRows"),
    "survey-detail-groups should own section-advice grouping"
  );
  assert.ok(
    groupsSource.includes("normalizedQuestionText"),
    "survey-detail-groups should own normalized question-text handling"
  );
  assert.ok(
    groupsSource.includes('normalizedSectionTitle = "분석 항목"'),
    "survey-detail-groups should own fallback section-title normalization"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "survey_detail_pages_reuses_group_helpers",
          "survey_detail_groups_own_normalization_logic",
          "survey_detail_groups_own_grouping_logic",
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
  console.error("[qa:b2b:report-summary-survey-detail-groups] FAIL", error);
  process.exit(1);
}
