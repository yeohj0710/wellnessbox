/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const summarySource = read("lib/b2b/employee-sync-summary.ts");
  const rawSupportSource = read("lib/b2b/employee-sync-summary.raw-support.ts");
  const fetchPatchSource = read("lib/b2b/employee-sync-summary.fetch-patch.ts");

  assert.ok(
    summarySource.includes('from "./employee-sync-summary.raw-support"'),
    "employee sync summary should import raw target helpers from dedicated support module"
  );
  assert.ok(
    summarySource.includes("hasRawTargetPayload"),
    "employee sync summary facade should keep hasRawTargetPayload visible"
  );
  assert.ok(
    summarySource.includes("mergeRawPayloadByTargets"),
    "employee sync summary facade should keep mergeRawPayloadByTargets visible"
  );
  assert.ok(
    rawSupportSource.includes("RAW_TARGET_KEY_MAP"),
    "raw support module should own raw target key mapping"
  );
  assert.ok(
    rawSupportSource.includes('checkupOverview: "checkupOverview"'),
    "raw support module should map checkupOverview explicitly"
  );
  assert.ok(
    rawSupportSource.includes("Object.prototype.hasOwnProperty.call"),
    "raw support module should merge only explicit patch raw keys"
  );
  assert.ok(
    rawSupportSource.includes("payloadHasRequestedRawTargets"),
    "raw support module should expose requested raw target coverage checks"
  );
  assert.ok(
    fetchPatchSource.includes("payloadHasRequestedRawTargets"),
    "summary fetch patch should reuse requested raw target coverage helper"
  );
  assert.ok(
    fetchPatchSource.includes('from "./employee-sync-summary.raw-support"'),
    "summary fetch patch should import raw coverage helper from raw support module"
  );
  console.log("[qa:b2b:employee-sync-summary-raw-support] PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b:employee-sync-summary-raw-support] FAIL", error);
  process.exit(1);
}
