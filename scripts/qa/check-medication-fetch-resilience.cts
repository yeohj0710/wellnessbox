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
  const medicationBackfillHelperSource = read(
    "lib/server/hyphen/fetch-executor.medication-backfill-helpers.ts"
  );
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
    fetchExecutorSource.includes("fetchedMedicalForMedicationBackfill"),
    "medication name backfill should fetch a medical date-source when summary targets omit medical"
  );
  assert.ok(
    fetchExecutorSource.includes(
      "[hyphen][fetch] medication backfill medical-source failed"
    ),
    "medication backfill medical-source fallback should log non-fatal failures"
  );
  assert.ok(
    medicationBackfillHelperSource.includes("fromDate: date"),
    "targeted medication backfill should narrow date range per recent visit"
  );
  assert.ok(
    medicationBackfillHelperSource.includes("buildMonthRangeMedicationPayload"),
    "medication backfill should include month-range fallback for same recent visit months"
  );
  assert.ok(
    fetchExecutorSource.includes("monthProbeDates"),
    "medication backfill should dedupe month probes from recent visit dates"
  );

  const medicationSource = read("lib/b2b/report-payload-medication.ts");
  const medicationHelperSource = read("lib/b2b/report-payload-medication-helpers.ts");
  assert.ok(
    medicationSource.includes("periodKey: { not: input.periodKey }"),
    "medication history fallback should include cross-period snapshots"
  );
  assert.ok(
    medicationSource.includes("const prioritizedRows = prioritizeMedicationRows(rows);"),
    "report payload medication rows should prioritize named medication rows before display capping"
  );
  assert.ok(
    medicationSource.includes("rows: prioritizedRows.slice(0, REPORT_MEDICATION_VISIT_LIMIT)"),
    "report payload medication rows should be capped after named-row prioritization"
  );
  assert.ok(
    medicationSource.includes("mergeMedicationRows"),
    "medication rows should merge raw and normalized sources with quality preference"
  );
  assert.ok(
    medicationHelperSource.includes("asParsedRecord(root.raw)"),
    "report payload medication resolver should parse snapshot raw envelope shape (`raw`)"
  );
  assert.ok(
    medicationHelperSource.includes("asParsedRecord(rootData?.raw)"),
    "report payload medication resolver should parse legacy envelope shape (`data.raw`)"
  );
  assert.ok(
    medicationHelperSource.includes("parseMaybeJson"),
    "report payload medication resolver should parse stringified raw envelope payloads"
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
    summaryPatchSource.includes("identity: input.identity"),
    "summary patch should propagate employee identity to network backfill payloads"
  );
  assert.ok(
    !summaryPatchSource.includes("skipNetworkFetchForMedicationBackfillOnly"),
    "summary patch should not suppress network retry for medication backfill-only cases"
  );
  assert.ok(
    summaryPatchSource.includes("mergeRawPayloadByTargets"),
    "summary patch should merge patched raw payload for updated targets"
  );
  assert.ok(
    summaryPatchSource.includes("hasRawTargetPayload"),
    "summary patch planner should detect missing raw target payloads even when normalized placeholders exist"
  );
  assert.ok(
    summaryPatchSource.includes("missingTargetSet.add(\"medication\")"),
    "summary patch planner should force medication patch when raw medication payload is missing"
  );

  const summaryNormalizerSource = read("lib/b2b/employee-sync-summary.normalizer.ts");
  assert.ok(
    summaryNormalizerSource.includes("hasMedicalMedicationHint"),
    "summary patch planner should detect medication-missing hints from medical rows"
  );
  assert.ok(
    summaryNormalizerSource.includes("medicationRows.length === 0"),
    "summary patch planner should treat empty medication rows as recoverable when medical hints exist"
  );

  const summaryPatchFetchSource = read(
    "lib/b2b/employee-sync-summary.fetch-patch.ts"
  );
  assert.ok(
    summaryPatchFetchSource.includes("resNm: input.identity?.name ?? undefined"),
    "summary patch network payload should include employee name for API compatibility"
  );
  assert.ok(
    summaryPatchFetchSource.includes(
      "mobileNo: input.identity?.phoneNormalized ?? undefined"
    ),
    "summary patch network payload should include employee phone for API compatibility"
  );
  assert.ok(
    summaryPatchFetchSource.includes("payloadHasRequestedRawTargets"),
    "summary patch cache selection should reject payloads missing requested raw targets"
  );

  const medicationExtractSource = read("lib/b2b/report-payload-health-medication.ts");
  assert.ok(
    medicationExtractSource.includes(
      "collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS)"
    ),
    "medication extraction should gather all available medication/ingredient name fields"
  );

  const reportSummarySource = read("components/b2b/ReportSummaryCards.tsx");
  const reportSummaryPagesSource = read(
    "components/b2b/report-summary/ReportSummaryPages.tsx"
  );
  const reportSummaryDetailModelSource = read(
    "components/b2b/report-summary/detail-data-model.ts"
  );
  assert.ok(
    reportSummarySource.includes("buildReportSummaryHealthMetrics(payload)"),
    "report summary should build health metric grid through the shared detail-data-model"
  );
  assert.ok(
    reportSummarySource.includes("const medications = medicationsAll;"),
    "report summary should render full medication-focused rows from payload"
  );
  assert.ok(
    reportSummaryDetailModelSource.includes("payload.health?.metrics"),
    "shared detail-data-model should still render health metric grid from full health.metrics payload"
  );
  assert.ok(
    !reportSummarySource.includes("최근 3건 진료/조제 이력을 확인하고"),
    "report summary copy should no longer force recent-3 visit framing"
  );
  assert.ok(
    reportSummarySource.includes("ReportSummaryMedicationPage"),
    "report summary should delegate medication detail rendering to ReportSummaryMedicationPage"
  );
  assert.ok(
    reportSummaryPagesSource.includes("data-report-page={String(pageNumber)}"),
    "medication detail page should expose dynamic page marker in ReportSummaryPages"
  );
  assert.ok(
    reportSummarySource.includes("pageNumber={medicationPageNumber}"),
    "report summary should pass the resolved medication page number into ReportSummaryMedicationPage"
  );
  assert.ok(
    reportSummarySource.includes("buildMedicationMetaLine"),
    "report summary should build medication meta from date/hospital only"
  );
  assert.ok(
    reportSummarySource.includes("buildReportSummaryMedicationReviewModel(payload)"),
    "report summary should build medication review rows through the shared detail-data-model"
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

  const reportServiceSource = read("lib/b2b/report-service.ts");
  assert.ok(
    reportServiceSource.includes("shouldRegenerateEmptyMedicationReport"),
    "report service should recover stale empty-medication reports when snapshot treatment rows exist"
  );
  assert.ok(
    reportServiceSource.includes("needsMedicationRecovery"),
    "ensureLatestB2bReport should trigger medication recovery regeneration check"
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
