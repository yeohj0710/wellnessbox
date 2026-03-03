/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function runSessionRouteChecks() {
  const source = read("lib/b2b/employee-session-route.ts");
  assert.ok(
    source.includes("getLatestB2bReport"),
    "session route should read latest report without forcing regeneration"
  );
  assert.ok(
    !source.includes("ensureLatestB2bReport("),
    "session route must not auto-create report on login"
  );
  assert.ok(
    source.includes("hasReport: !!report"),
    "session login response should include hasReport for DB-priority client handling"
  );
  console.log("[qa:employee-report-db-priority] PASS session route checks");
}

function runClientChecks() {
  const source = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  assert.ok(
    source.includes("if (!session.latestReport)"),
    "client boot flow should stop auto-load when DB report is missing"
  );
  assert.ok(
    source.includes("if (!loginResult.hasReport)"),
    "client login flow should handle found identity with missing DB report"
  );
  assert.ok(
    source.includes("clearLocalIdentityCache();"),
    "client should clear local identity cache when DB identity/report is missing"
  );
  assert.ok(
    source.includes("resetReportState();"),
    "client should clear stale report UI when DB report is missing"
  );
  console.log("[qa:employee-report-db-priority] PASS client checks");
}

function run() {
  runSessionRouteChecks();
  runClientChecks();
  console.log("[qa:employee-report-db-priority] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:employee-report-db-priority] FAIL", error);
  process.exit(1);
}
