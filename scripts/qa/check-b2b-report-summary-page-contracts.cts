/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const pagesSource = read("components/b2b/report-summary/ReportSummaryPages.tsx");
  const contractsSource = read("components/b2b/report-summary/page-contracts.ts");

  assert.ok(
    pagesSource.includes('from "./page-contracts"'),
    "ReportSummaryPages should import page contracts from page-contracts"
  );
  assert.ok(
    pagesSource.includes("ReportSummaryOverviewPageProps"),
    "ReportSummaryPages should use shared overview page props"
  );
  assert.ok(
    pagesSource.includes("ReportSummaryHealthPageProps"),
    "ReportSummaryPages should use shared health page props"
  );
  assert.ok(
    pagesSource.includes("ReportSummaryMedicationPageProps"),
    "ReportSummaryPages should use shared medication page props"
  );
  assert.ok(
    !pagesSource.includes("type ScoreDisplay ="),
    "ReportSummaryPages should not keep local score-display type after extraction"
  );
  assert.ok(
    !pagesSource.includes("type MedicationRow ="),
    "ReportSummaryPages should not keep local medication row type after extraction"
  );

  assert.ok(
    contractsSource.includes("export type ReportSummaryOverviewPageProps"),
    "page-contracts should own overview page prop contracts"
  );
  assert.ok(
    contractsSource.includes("export type ReportSummaryHealthPageProps"),
    "page-contracts should own health page prop contracts"
  );
  assert.ok(
    contractsSource.includes("export type ReportSummaryMedicationPageProps"),
    "page-contracts should own medication page prop contracts"
  );
  assert.ok(
    contractsSource.includes("export type ReportSummaryOverviewText"),
    "page-contracts should own overview page text contract"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_summary_pages_reuses_page_contracts",
          "page_contracts_own_page_prop_shapes",
          "page_contracts_own_text_contracts",
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
  console.error("[qa:b2b:report-summary-page-contracts] FAIL", error);
  process.exit(1);
}
