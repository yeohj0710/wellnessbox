/* eslint-disable no-console */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const has = (source, token, label) => assert.ok(source.includes(token), `missing ${label}: ${token}`);

function run() {
  const employees = read("app/api/admin/b2b/employees/route.ts");
  const employee = read("app/api/admin/b2b/employees/[employeeId]/route.ts");
  const ops = read("app/api/admin/b2b/employees/[employeeId]/ops/route.ts");
  for (const [source, tokens] of [[employees,["export const GET","export const POST"]],[employee,["export const GET","export const PATCH","export const DELETE"]],[ops,["export const GET","export const POST"]]]) for (const token of tokens) has(source, token, "route export");

  const management = read("lib/b2b/admin-employee-management-route.ts");
  const managementOps = read("lib/b2b/admin-employee-management-route-ops.ts");
  for (const token of ["requireAdminSession","requireAdminExistingEmployeeId","clearHyphenCachesForEmployee","clearLink"]) has(management, token, "guard/operation wiring");
  has(managementOps, "clearNhisFetchMemoryCacheForUser", "memory cache cleanup");
  for (const action of ["reset_all_b2b_data","reset_period_data","clear_hyphen_cache","delete_record"]) has(management, `action: z.literal(\"${action}\")`, "action schema");
  for (const record of ["healthSnapshot","surveyResponse","analysisResult","pharmacistNote","report","accessLog","adminActionLog","healthFetchCache","healthFetchAttempt"]) has(managementOps, `"${record}"`, "record deletion branch");

  const legacyPage = read("app/(admin)/admin/b2b-employee-data/page.tsx");
  has(legacyPage, 'redirect("/admin/b2b-reports")', "legacy route redirect");
  const unifiedPanel = read("app/(admin)/admin/b2b-reports/_components/B2bAdminEmployeeManagementPanel.tsx");
  has(unifiedPanel, "B2bEmployeeDataWorkspace", "unified employee workspace");
  has(unifiedPanel, "useB2bEmployeeDataActions", "unified employee actions");
  const api = read("app/(admin)/admin/b2b-employee-data/_lib/api.ts");
  has(api, "/api/admin/b2b/employees", "employee API usage");
  has(read("app/(admin)/admin/page.tsx"), "/admin/b2b-reports", "admin navigation");
  console.log("[qa:b2b-admin-employee-data] ALL PASS");
}

try { run(); } catch (error) { console.error("[qa:b2b-admin-employee-data] FAIL", error); process.exit(1); }
