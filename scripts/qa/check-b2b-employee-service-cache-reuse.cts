/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const serviceSource = read("lib/b2b/employee-service.ts");
  const reuseSource = read("lib/b2b/employee-service-cache-reuse.ts");

  assert.ok(
    serviceSource.includes("resolveEmployeeSyncReusableSnapshot"),
    "employee service should delegate cache/history reuse to dedicated helper"
  );
  assert.ok(
    serviceSource.includes('from "@/lib/b2b/employee-service-cache-reuse"'),
    "employee service should import cache reuse helper"
  );
  assert.ok(
    reuseSource.includes("getValidNhisFetchCache"),
    "employee service cache reuse helper should own valid-cache lookup"
  );
  assert.ok(
    reuseSource.includes("getLatestNhisFetchCacheByIdentity"),
    "employee service cache reuse helper should own history-cache lookup"
  );
  assert.ok(
    reuseSource.includes("patchSummaryTargetsIfNeeded"),
    "employee service cache reuse helper should own summary patching before persistence"
  );
  assert.ok(
    reuseSource.includes("persistSnapshotAndSyncState"),
    "employee service cache reuse helper should own reused payload persistence"
  );
  console.log("[qa:b2b:employee-service-cache-reuse] PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b:employee-service-cache-reuse] FAIL", error);
  process.exit(1);
}
