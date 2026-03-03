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
    source.includes("최신 복약 연동에 일부 실패가 있어"),
    "recovered medication status should include degraded-data guidance"
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
    fetchExecutorSource.includes("const recovered = await tryMedicalFallback();"),
    "medication fetch should still support medical fallback for sparse accounts"
  );

  const medicationSource = read("lib/b2b/report-payload-medication.ts");
  assert.ok(
    medicationSource.includes("periodKey: { not: input.periodKey }"),
    "medication history fallback should include cross-period snapshots"
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
