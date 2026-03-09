import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ROUTE_PATH = path.resolve(ROOT_DIR, "lib/b2b/employee-sync-route.ts");
const HANDLER_SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-route-handler-support.ts"
);
const FAILURE_SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-route-failure-support.ts"
);

function run() {
  const routeSource = fs.readFileSync(ROUTE_PATH, "utf8");
  const handlerSupportSource = fs.readFileSync(HANDLER_SUPPORT_PATH, "utf8");
  const failureSupportSource = fs.readFileSync(FAILURE_SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    routeSource,
    /employee-sync-route-failure-support/,
    "employee sync route must import failure support helpers."
  );
  assert.match(
    handlerSupportSource,
    /employee-sync-route-failure-support/,
    "employee sync route handler support must import shared failure support helpers."
  );
  checks.push("route_and_handler_support_import_failure_support");

  for (const token of [
    "const DEFAULT_DB_POOL_BUSY_RETRY_AFTER_SEC = 20;",
    "function resolveDbPoolBusyRetryAfterSec()",
    "function describeSyncError(error: unknown)",
    "const dbError = resolveDbRouteError(",
  ]) {
    assert.ok(
      !routeSource.includes(token),
      `[qa:b2b:employee-sync-route-failure-support] employee-sync-route.ts should not keep inline failure helper token: ${token}`
    );
  }
  checks.push("route_no_longer_keeps_inline_failure_helpers");

  for (const token of [
    "export const EMPLOYEE_SYNC_DB_POOL_BUSY_ERROR =",
    "export const EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR =",
    "export function buildDbPoolBusySyncResponse(",
    "export function describeEmployeeSyncError(",
    "export function resolveEmployeeSyncExecuteFailure(",
    "nextAction: \"wait\"",
  ]) {
    assert.ok(
      failureSupportSource.includes(token),
      `[qa:b2b:employee-sync-route-failure-support] failure support module missing token: ${token}`
    );
  }
  checks.push("failure_support_owns_db_busy_and_execute_failure_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
