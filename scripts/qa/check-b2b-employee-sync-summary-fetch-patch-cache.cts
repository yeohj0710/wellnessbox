/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const fetchPatchSource = read("lib/b2b/employee-sync-summary.fetch-patch.ts");
  const cacheSupportSource = read(
    "lib/b2b/employee-sync-summary.fetch-patch-cache.ts"
  );

  assert.ok(
    fetchPatchSource.includes("resolveSummaryPatchCachedPayload"),
    "summary fetch patch should delegate cache selection to cache support module"
  );
  assert.ok(
    fetchPatchSource.includes('from "./employee-sync-summary.fetch-patch-cache"'),
    "summary fetch patch should import cache selection helper from dedicated module"
  );
  assert.ok(
    cacheSupportSource.includes("getValidNhisFetchCache"),
    "cache support should own valid-cache lookup"
  );
  assert.ok(
    cacheSupportSource.includes("getLatestNhisFetchCacheByIdentity"),
    "cache support should own identity history lookup"
  );
  assert.ok(
    cacheSupportSource.includes("getLatestNhisFetchCacheByIdentityGlobal"),
    "cache support should own global identity history lookup"
  );
  assert.ok(
    cacheSupportSource.includes("markNhisFetchCacheHit"),
    "cache support should own valid-cache hit marking"
  );
  assert.ok(
    cacheSupportSource.includes("isUsableSummaryPatchCachedPayload"),
    "cache support should own cache payload usability checks"
  );
  console.log("[qa:b2b:employee-sync-summary-fetch-patch-cache] PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b:employee-sync-summary-fetch-patch-cache] FAIL", error);
  process.exit(1);
}
