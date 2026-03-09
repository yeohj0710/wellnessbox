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
  const integratedPreviewModelSource = read(
    "app/(admin)/admin/b2b-reports/_lib/b2b-integrated-result-preview-model.ts"
  );
  const detailModelSource = read("components/b2b/report-summary/detail-data-model.ts");

  assert.ok(
    cardsSource.includes('from "./report-summary/detail-data-model"'),
    "ReportSummaryCards should import the shared detail-data-model"
  );
  assert.ok(
    cardsSource.includes("buildReportSummaryHealthMetrics(payload)"),
    "ReportSummaryCards should build health metrics through the shared detail-data-model"
  );
  assert.ok(
    cardsSource.includes("buildReportSummaryMedicationReviewModel(payload)"),
    "ReportSummaryCards should build medication review data through the shared detail-data-model"
  );
  assert.ok(
    integratedPreviewModelSource.includes(
      'from "@/components/b2b/report-summary/detail-data-model"'
    ),
    "integrated preview model should also reuse the shared detail-data-model"
  );
  assert.ok(
    detailModelSource.includes("export function buildReportSummaryHealthMetrics"),
    "detail-data-model should own shared health-metric assembly"
  );
  assert.ok(
    detailModelSource.includes("export function buildReportSummaryMedicationReviewModel"),
    "detail-data-model should own shared medication/pharmacist assembly"
  );
  assert.ok(
    detailModelSource.includes("export function buildMedicationMetaLine"),
    "detail-data-model should own medication meta formatting"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_summary_cards_reuses_detail_model",
          "integrated_preview_reuses_detail_model",
          "detail_model_owns_shared_health_and_medication_assembly",
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
  console.error("[qa:b2b:report-summary-detail-data-model] FAIL", error);
  process.exit(1);
}
