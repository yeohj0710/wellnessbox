/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const Module = require("module");
const originalLoad = Module._load;
Module._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const {
  __resetB2bLogThrottleMemoryForTest,
  buildAdminActionThrottleKey,
  buildEmployeeAccessThrottleKey,
  isLogThrottleMemoryHit,
  rememberLogThrottleKey,
  resolveAdminActionLogThrottleMs,
  resolveEmployeeAccessLogThrottleMs,
} = require(path.join(ROOT, "lib/b2b/log-throttle.ts")) as {
  __resetB2bLogThrottleMemoryForTest: () => void;
  buildAdminActionThrottleKey: (input: {
    employeeId?: string | null;
    action: string;
    actorTag?: string | null;
  }) => string;
  buildEmployeeAccessThrottleKey: (input: {
    employeeId?: string | null;
    appUserId?: string | null;
    action: string;
    route?: string | null;
  }) => string;
  isLogThrottleMemoryHit: (key: string, nowMs?: number) => boolean;
  rememberLogThrottleKey: (key: string, windowMs: number, nowMs?: number) => void;
  resolveAdminActionLogThrottleMs: (action: string) => number;
  resolveEmployeeAccessLogThrottleMs: (action: string) => number;
};

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function runThrottleConfigCases() {
  assert.ok(resolveEmployeeAccessLogThrottleMs("report_view") > 0);
  assert.ok(resolveEmployeeAccessLogThrottleMs("session_status") > 0);
  assert.ok(resolveEmployeeAccessLogThrottleMs("session_login_success") > 0);
  assert.equal(resolveEmployeeAccessLogThrottleMs("sync_success"), 0);

  assert.ok(resolveAdminActionLogThrottleMs("report_export_pdf") > 0);
  assert.ok(resolveAdminActionLogThrottleMs("report_export_pptx") > 0);
  assert.equal(resolveAdminActionLogThrottleMs("employee_patch"), 0);
  console.log("[qa:b2b-log-throttle] PASS throttle config cases");
}

function runMemoryThrottleCases() {
  __resetB2bLogThrottleMemoryForTest();
  const accessKey = buildEmployeeAccessThrottleKey({
    employeeId: "emp-1",
    appUserId: "app-1",
    action: "report_view",
    route: "/api/b2b/employee/report",
  });
  const adminKey = buildAdminActionThrottleKey({
    employeeId: "emp-1",
    action: "report_export_pdf",
    actorTag: "admin",
  });

  assert.equal(isLogThrottleMemoryHit(accessKey, 1_000), false);
  rememberLogThrottleKey(accessKey, 500, 1_000);
  assert.equal(isLogThrottleMemoryHit(accessKey, 1_200), true);
  assert.equal(isLogThrottleMemoryHit(accessKey, 1_501), false);

  rememberLogThrottleKey(adminKey, 1_000, 2_000);
  assert.equal(isLogThrottleMemoryHit(adminKey, 2_500), true);
  assert.equal(isLogThrottleMemoryHit(adminKey, 3_500), false);
  console.log("[qa:b2b-log-throttle] PASS memory throttle cases");
}

function runStaticRegressionChecks() {
  const source = read("lib/b2b/employee-service.ts");
  assert.ok(
    source.includes("shouldSkipEmployeeAccessLogWrite"),
    "employee-service should guard access logs with dedupe checks"
  );
  assert.ok(
    source.includes("shouldSkipAdminActionLogWrite"),
    "employee-service should guard admin logs with dedupe checks"
  );
  assert.ok(
    source.includes("db.b2bEmployeeAccessLog.findFirst"),
    "employee access dedupe should check recent log rows"
  );
  assert.ok(
    source.includes("db.b2bAdminActionLog.findFirst"),
    "admin action dedupe should check recent log rows"
  );
  console.log("[qa:b2b-log-throttle] PASS static regression checks");
}

function run() {
  runThrottleConfigCases();
  runMemoryThrottleCases();
  runStaticRegressionChecks();
  console.log("[qa:b2b-log-throttle] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b-log-throttle] FAIL", error);
  process.exit(1);
}
