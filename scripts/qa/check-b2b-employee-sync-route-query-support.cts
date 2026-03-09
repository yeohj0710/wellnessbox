import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ROUTE_PATH = path.resolve(ROOT_DIR, "lib/b2b/employee-sync-route.ts");
const SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-route-query-support.ts"
);

function run() {
  const routeSource = fs.readFileSync(ROUTE_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    routeSource,
    /employee-sync-route-query-support/,
    "employee sync route must import query support helpers."
  );
  checks.push("route_imports_query_support");

  assert.ok(
    !routeSource.includes("db.b2bHealthDataSnapshot.findFirst"),
    "[qa:b2b:employee-sync-route-query-support] employee-sync-route.ts should not keep inline snapshot findFirst queries"
  );
  checks.push("route_no_longer_keeps_inline_snapshot_queries");

  for (const token of [
    "export async function findLatestEmployeeSyncReusableSnapshot(",
    'provider: "HYPHEN_NHIS"',
    "export async function findLatestEmployeeSyncTimeoutFallbackSnapshot(",
    'orderBy: { fetchedAt: "desc" }',
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:b2b:employee-sync-route-query-support] query support module missing token: ${token}`
    );
  }
  checks.push("query_support_owns_snapshot_lookup_queries");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
