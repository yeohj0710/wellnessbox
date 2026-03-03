/* eslint-disable no-console */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function expectIncludes(source, token, label) {
  assert.ok(
    source.includes(token),
    `[qa:b2b-admin-employee-data] missing token: ${label} (${token})`
  );
}

function runRouteChecks() {
  const employeesRoute = read("app/api/admin/b2b/employees/route.ts");
  expectIncludes(employeesRoute, "export const GET", "employees GET export");
  expectIncludes(employeesRoute, "export const POST", "employees POST export");
  expectIncludes(
    employeesRoute,
    "runAdminEmployeeCreatePostRoute",
    "employees create handler import"
  );

  const employeeRoute = read("app/api/admin/b2b/employees/[employeeId]/route.ts");
  expectIncludes(employeeRoute, "export const GET", "employee detail GET export");
  expectIncludes(employeeRoute, "export const PATCH", "employee PATCH export");
  expectIncludes(employeeRoute, "export const DELETE", "employee DELETE export");

  const opsRoute = read("app/api/admin/b2b/employees/[employeeId]/ops/route.ts");
  expectIncludes(opsRoute, "export const GET", "employee ops GET export");
  expectIncludes(opsRoute, "export const POST", "employee ops POST export");
}

function runGuardChecks() {
  const management = read("lib/b2b/admin-employee-management-route.ts");
  expectIncludes(management, "requireAdminSession", "admin session guard");
  expectIncludes(
    management,
    "requireAdminExistingEmployeeId",
    "existing employee guard"
  );
  expectIncludes(management, "clearNhisLink", "hyphen link clear integration");
  expectIncludes(
    management,
    "clearNhisFetchMemoryCacheForUser",
    "hyphen memory cache clear integration"
  );
}

function runOperationChecks() {
  const management = read("lib/b2b/admin-employee-management-route.ts");
  const requiredActions = [
    "reset_all_b2b_data",
    "reset_period_data",
    "clear_hyphen_cache",
    "delete_record",
  ];
  for (const action of requiredActions) {
    expectIncludes(management, `action: z.literal(\"${action}\")`, `action schema ${action}`);
  }

  const requiredRecordTypes = [
    "healthSnapshot",
    "surveyResponse",
    "analysisResult",
    "pharmacistNote",
    "report",
    "accessLog",
    "adminActionLog",
    "healthFetchCache",
    "healthFetchAttempt",
  ];
  for (const recordType of requiredRecordTypes) {
    expectIncludes(
      management,
      `"${recordType}"`,
      `delete record type ${recordType}`
    );
  }
}

function runUiChecks() {
  const page = read("app/(admin)/admin/b2b-employee-data/page.tsx");
  expectIncludes(page, "B2bAdminEmployeeDataClient", "ops page client import");

  const client = read("app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx");
  expectIncludes(client, "임직원 데이터 운영 콘솔", "Korean heading");
  expectIncludes(client, "하이픈 캐시/세션 정리", "hyphen maintenance action");

  const clientApi = read("app/(admin)/admin/b2b-employee-data/_lib/api.ts");
  expectIncludes(clientApi, "/api/admin/b2b/employees", "employee api usage");

  const adminPage = read("app/(admin)/admin/page.tsx");
  expectIncludes(
    adminPage,
    "/admin/b2b-employee-data",
    "admin navigation link to data ops"
  );
}

function run() {
  runRouteChecks();
  runGuardChecks();
  runOperationChecks();
  runUiChecks();
  console.log("[qa:b2b-admin-employee-data] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b-admin-employee-data] FAIL", error);
  process.exit(1);
}
