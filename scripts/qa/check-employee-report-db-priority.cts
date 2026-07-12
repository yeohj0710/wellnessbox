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
  const bootstrapSource = read(
    "app/(features)/employee-report/_lib/use-employee-report-session-bootstrap.ts"
  );
  assert.ok(
    bootstrapSource.includes("const session = await fetchEmployeeSession()"),
    "client boot flow should resolve the server session before loading report state"
  );
  assert.ok(
    bootstrapSource.includes("onWorkspaceLoaded(await loadWorkspace())"),
    "client boot flow should load report state from the server workspace"
  );
  assert.ok(
    source.includes("if (!nextWorkspace.currentStatus?.hasAnyWorkspaceData)"),
    "client should handle an existing DB identity with no report workspace data"
  );
  assert.ok(
    !source.includes("ensureLatestB2bReport(") &&
      !bootstrapSource.includes("ensureLatestB2bReport("),
    "client must not generate a report locally when DB report state is missing"
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
