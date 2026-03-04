/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function runMedicationStatusCases() {
  const source = read("lib/b2b/report-payload-issues.ts");
  const medicationRowsBranch = source.indexOf("if (input.medications.length > 0)");
  const failureBranch = source.indexOf("if (medicationFailed)");
  assert.ok(medicationRowsBranch >= 0, "medication rows branch must exist");
  assert.ok(failureBranch >= 0, "medication failure branch must exist");
  assert.ok(
    medicationRowsBranch < failureBranch,
    "available medication rows should be evaluated before fetch_failed fallback"
  );
  assert.ok(
    source.includes("message: null"),
    "medication rows should not emit an extra warning banner message"
  );
  assert.ok(
    !source.includes(
      "\ucd5c\uadfc 3\uac74\uc740 \uc57d\ud488\uba85 \ub300\uc2e0 \uc9c4\ub8cc\uc720\ud615 \uae30\uc900\uc73c\ub85c \ud45c\uc2dc\ub429\ub2c8\ub2e4."
    ),
    "legacy visit-type fallback warning copy should be removed"
  );
  console.log("[qa:medication-fetch-resilience] PASS medication status checks");
}

function runStaticRegressionChecks() {
  const fetchExecutorSource = read("lib/server/hyphen/fetch-executor.ts");
  assert.ok(
    fetchExecutorSource.includes("fetchMedicationInfo(input.basePayload)"),
    "medication fetch should retry using base payload when detail payload fails"
  );
  assert.ok(
    !fetchExecutorSource.includes("tryMedicalFallback"),
    "medication fetch should not invoke extra medical fallback calls (cost guard)"
  );
  assert.ok(
    !fetchExecutorSource.includes("tryMedicationNameBackfill"),
    "medication fetch should not invoke extra medication-name backfill retries (cost guard)"
  );
  assert.ok(
    !fetchExecutorSource.includes("buildMedicationBackfillDateRanges"),
    "medication fetch should not derive extra backfill date windows (cost guard)"
  );
  assert.ok(
    fetchExecutorSource.includes("payloadHasAnyRows(detailPayloadResult)"),
    "medication fetch should return detail payload when rows exist"
  );
  assert.ok(
    fetchExecutorSource.includes("MEDICATION_RECENT_VISIT_BACKFILL_LIMIT = 3"),
    "medication fetch should keep recent-visit detail backfill bounded to 3"
  );
  assert.ok(
    fetchExecutorSource.includes("fetchMedicationByRecentVisitsBackfill"),
    "medication fetch should try targeted recent-visit backfill when names are missing"
  );
  assert.ok(
    fetchExecutorSource.includes("fromDate: date"),
    "targeted medication backfill should narrow date range per recent visit"
  );

  const medicationSource = read("lib/b2b/report-payload-medication.ts");
  assert.ok(
    medicationSource.includes("periodKey: { not: input.periodKey }"),
    "medication history fallback should include cross-period snapshots"
  );
  assert.ok(
    medicationSource.includes("rows: rows.slice(0, REPORT_MEDICATION_VISIT_LIMIT)"),
    "report payload medication rows should be capped to the most recent 3 visits"
  );
  assert.ok(
    medicationSource.includes("mergeMedicationRows"),
    "medication rows should merge raw and normalized sources with quality preference"
  );
  assert.ok(
    medicationSource.includes("asRecord(root.raw)"),
    "report payload medication resolver should parse snapshot raw envelope shape (`raw`)"
  );
  assert.ok(
    medicationSource.includes("asRecord(data?.raw)"),
    "report payload medication resolver should parse legacy envelope shape (`data.raw`)"
  );
  assert.ok(
    medicationSource.includes(
      "(primaryRows.length === 0 || !hasNamedMedicationRows(primaryRows))"
    ),
    "history fallback should run when latest rows are missing or contain only derived labels"
  );

  const summaryPatchSource = read("lib/b2b/employee-sync-summary.ts");
  assert.ok(
    summaryPatchSource.includes("allowNetwork: true"),
    "summary patch should allow network retry for medication name backfill"
  );
  assert.ok(
    !summaryPatchSource.includes("skipNetworkFetchForMedicationBackfillOnly"),
    "summary patch should not suppress network retry for medication backfill-only cases"
  );
  assert.ok(
    summaryPatchSource.includes("mergeRawPayloadByTargets"),
    "summary patch should merge patched raw payload for updated targets"
  );

  const medicationExtractSource = read("lib/b2b/report-payload-health-medication.ts");
  assert.ok(
    medicationExtractSource.includes(
      "collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS)"
    ),
    "medication extraction should gather all available medication/ingredient name fields"
  );

  const reportSummarySource = read("components/b2b/ReportSummaryCards.tsx");
  assert.ok(
    reportSummarySource.includes("payload.health?.metrics"),
    "report summary should render health metric grid from full health.metrics payload"
  );
  assert.ok(
    reportSummarySource.includes("const medications = medicationsAll.slice(0, 3);"),
    "report summary should render only the most recent 3 medication visits"
  );
  assert.ok(
    reportSummarySource.includes("data-report-page=\"3\""),
    "medication detail section should be moved to page 3"
  );
  assert.ok(
    reportSummarySource.includes("buildMedicationMetaLine"),
    "report summary should build medication meta from date/hospital only"
  );
  assert.ok(
    !reportSummarySource.includes("medication.dosageDay"),
    "report summary medication meta should not include dosage day count"
  );

  const layoutSource = read("lib/b2b/export/layout-dsl.ts");
  assert.ok(
    !layoutSource.includes("const dayText = item.dosageDay"),
    "legacy layout medication lines should not append dosage day count"
  );

  const insightSource = read("components/b2b/report-summary/card-insights.ts");
  assert.ok(
    insightSource.includes("stripHtmlToPlainText"),
    "metric formatter should sanitize legacy HTML unit strings"
  );
  assert.ok(
    insightSource.includes("replace(/<sup>\\s*([0-9]+)\\s*<\\/sup>/gi, \"$1\")"),
    "metric formatter should normalize <sup> unit notation to plain text"
  );

  const metricsSource = read("lib/b2b/report-payload-health-metrics.ts");
  assert.ok(
    !metricsSource.includes("if (metrics.length >= 16) break;"),
    "health metric extraction should not truncate measured indicators at 16"
  );
  console.log("[qa:medication-fetch-resilience] PASS static regression checks");
}

function run() {
  runMedicationStatusCases();
  runStaticRegressionChecks();
  console.log("[qa:medication-fetch-resilience] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:medication-fetch-resilience] FAIL", error);
  process.exit(1);
}
