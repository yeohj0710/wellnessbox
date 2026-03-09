import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const HANDLER_PATH = path.resolve(ROOT_DIR, "lib/b2b/employee-sync-route-handler.ts");
const SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-route-handler-support.ts"
);

function run() {
  const handlerSource = fs.readFileSync(HANDLER_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    handlerSource,
    /employee-sync-route-handler-support/,
    "employee sync route handler must import handler support helpers."
  );
  checks.push("handler_imports_support_module");

  for (const token of [
    "const INPUT_INVALID_ERROR =",
    "const SYNC_FAILED_ERROR =",
    "parsed.error.issues[0]?.message ||",
    "const dbError = resolveDbRouteError(error,",
  ]) {
    assert.ok(
      !handlerSource.includes(token),
      `[qa:b2b:employee-sync-route-handler-support] employee-sync-route-handler.ts should not keep inline helper token: ${token}`
    );
  }
  checks.push("handler_no_longer_keeps_inline_validation_and_failure_mapping");

  for (const token of [
    "export const employeeSyncRequestSchema =",
    "export type EmployeeSyncPayload =",
    "export const EMPLOYEE_SYNC_INPUT_INVALID_ERROR =",
    "export function buildEmployeeSyncDedupKey(",
    "export function buildEmployeeSyncValidationErrorResponse(",
    "export function buildEmployeeSyncRouteFailureResponse(",
    "EMPLOYEE_SYNC_EXECUTE_FAILED_ERROR",
    "describeEmployeeSyncError",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:b2b:employee-sync-route-handler-support] handler support module missing token: ${token}`
    );
  }
  checks.push("support_module_owns_schema_dedup_validation_and_failure_mapping");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
