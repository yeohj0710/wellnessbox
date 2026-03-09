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
  const overviewModelSource = read("components/b2b/report-summary/overview-model.ts");

  assert.ok(
    cardsSource.includes('from "./report-summary/overview-model"'),
    "ReportSummaryCards should import the shared overview-model"
  );
  assert.ok(
    cardsSource.includes("buildReportSummaryOverviewModel(payload)"),
    "ReportSummaryCards should build first-page overview state through the shared overview-model"
  );
  assert.ok(
    cardsSource.includes("sectionTitleById"),
    "ReportSummaryCards should reuse section titles from the shared overview-model"
  );
  assert.ok(
    !cardsSource.includes("const DONUT_RADIUS = 52;"),
    "ReportSummaryCards should not keep local donut constants after overview-model extraction"
  );
  assert.ok(
    !cardsSource.includes("function toLifestyleRiskLabel"),
    "ReportSummaryCards should not keep local lifestyle-risk labeling internals after extraction"
  );

  assert.ok(
    overviewModelSource.includes("export function buildReportSummaryOverviewModel"),
    "overview-model should own first-page overview assembly"
  );
  assert.ok(
    overviewModelSource.includes("export const REPORT_SUMMARY_RADAR_LEVELS"),
    "overview-model should own radar-level constants"
  );
  assert.ok(
    overviewModelSource.includes("sectionNeedsForPage1"),
    "overview-model should own first-page section-need trimming"
  );
  assert.ok(
    overviewModelSource.includes("sectionTitleById"),
    "overview-model should expose section-title lookup for downstream reuse"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_summary_cards_reuses_overview_model",
          "overview_model_owns_first_page_chart_calculations",
          "overview_model_exposes_section_title_lookup",
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
  console.error("[qa:b2b:report-summary-overview-model] FAIL", error);
  process.exit(1);
}
