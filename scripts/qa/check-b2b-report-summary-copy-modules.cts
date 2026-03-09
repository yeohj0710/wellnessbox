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
  const copySource = read("components/b2b/report-summary/copy.ts");

  assert.ok(
    cardsSource.includes('from "./report-summary/copy"'),
    "ReportSummaryCards should import shared report-summary copy"
  );
  assert.ok(
    cardsSource.includes("text={REPORT_SUMMARY_OVERVIEW_TEXT}"),
    "ReportSummaryCards should pass overview copy through the shared copy module"
  );
  assert.ok(
    cardsSource.includes("text={REPORT_SUMMARY_HEALTH_PAGE_TEXT}"),
    "ReportSummaryCards should pass health-page copy through the shared copy module"
  );
  assert.ok(
    cardsSource.includes("text={REPORT_SUMMARY_MEDICATION_PAGE_TEXT}"),
    "ReportSummaryCards should pass medication-page copy through the shared copy module"
  );
  assert.ok(
    !cardsSource.includes('title: "이번 달 건강 상태 요약과 우선 실천 항목"'),
    "ReportSummaryCards should not keep overview copy inline after extraction"
  );

  assert.ok(
    copySource.includes("export const REPORT_SUMMARY_OVERVIEW_TEXT"),
    "copy.ts should own overview page copy"
  );
  assert.ok(
    copySource.includes("export const REPORT_SUMMARY_HEALTH_PAGE_TEXT"),
    "copy.ts should own health page copy"
  );
  assert.ok(
    copySource.includes("export const REPORT_SUMMARY_MEDICATION_PAGE_TEXT"),
    "copy.ts should own medication page copy"
  );
  assert.ok(
    copySource.includes("REPORT_SUMMARY_HEALTH_INSIGHT_EMPTY_MESSAGE"),
    "copy.ts should own health insight empty-state copy"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_summary_cards_reuses_copy_module",
          "copy_module_owns_page_level_text_contracts",
          "copy_module_owns_health_empty_message",
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
  console.error("[qa:b2b:report-summary-copy-modules] FAIL", error);
  process.exit(1);
}
