/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function runSyncTimeoutFallbackChecks() {
  const source = read("lib/b2b/employee-sync-route.ts");
  assert.ok(
    source.includes('if (error.reason === "hyphen_fetch_timeout")'),
    "employee sync route should handle hyphen timeout as a recoverable branch when snapshot exists"
  );
  assert.ok(
    source.includes("sync_timeout_reused_snapshot"),
    "employee sync route should emit a dedicated access-log action for timeout fallback reuse"
  );
  assert.ok(
    source.includes('source: "snapshot-history"'),
    "timeout fallback should return snapshot-history sync source"
  );
  assert.ok(
    source.includes("networkFetched: false"),
    "timeout fallback should mark networkFetched as false"
  );
  console.log("[qa:employee-report-timeout-fallback] PASS sync timeout fallback");
}

function runHealthInterpretationPlaceholderChecks() {
  const source = read("components/b2b/ReportSummaryCards.tsx");
  assert.ok(
    source.includes('const healthInsightEmptyMessage = "내용이 없습니다.";'),
    "health interpretation section should use fixed empty placeholder copy"
  );
  assert.ok(
    source.includes("<p className={styles.reportDataEmpty}>{healthInsightEmptyMessage}</p>"),
    "health interpretation section should render empty placeholder paragraph"
  );
  assert.ok(
    !source.includes("buildHealthInsightLines"),
    "health interpretation section should no longer render computed insight bullet list"
  );
  console.log(
    "[qa:employee-report-timeout-fallback] PASS health interpretation placeholder"
  );
}

function runSignGuidanceTypographyChecks() {
  const source = read("components/b2b/B2bUx.module.css");
  const blockStart = source.indexOf(".syncGuidanceMessageSign");
  assert.ok(blockStart >= 0, "sync guidance sign style block must exist");
  const blockEnd = source.indexOf("}", blockStart);
  const block = blockEnd > blockStart ? source.slice(blockStart, blockEnd + 1) : "";
  assert.ok(
    /font-size:\s*14px;/.test(block),
    "sign guidance message should use reduced font-size 14px"
  );
  assert.ok(
    /font-weight:\s*700;/.test(block),
    "sign guidance message should use reduced font-weight 700"
  );
  console.log("[qa:employee-report-timeout-fallback] PASS sign guidance typography");
}

function run() {
  runSyncTimeoutFallbackChecks();
  runHealthInterpretationPlaceholderChecks();
  runSignGuidanceTypographyChecks();
  console.log("[qa:employee-report-timeout-fallback] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:employee-report-timeout-fallback] FAIL", error);
  process.exit(1);
}

