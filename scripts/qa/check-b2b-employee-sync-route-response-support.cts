import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ROUTE_PATH = path.resolve(ROOT_DIR, "lib/b2b/employee-sync-route.ts");
const SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-route-response-support.ts"
);

function run() {
  const routeSource = fs.readFileSync(ROUTE_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    routeSource,
    /employee-sync-route-response-support/,
    "employee sync route must import response support helpers."
  );
  checks.push("route_imports_response_support");

  for (const token of [
    "remainingCooldownSeconds: successCooldown.remainingSeconds",
    "cooldownAvailableAt: successCooldown.availableAt",
  ]) {
    assert.ok(
      !routeSource.includes(token),
      `[qa:b2b:employee-sync-route-response-support] employee-sync-route.ts should not keep inline response token: ${token}`
    );
  }
  checks.push("route_no_longer_keeps_inline_response_assembly");

  for (const token of [
    "export function buildEmployeeSyncSuccessResponse(",
    "export function buildEmployeeSyncBlockedResponse(",
    "resolvePostForceRefreshCooldown",
    "buildSyncSuccessResponse({",
    "nextAction: error.nextAction",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:b2b:employee-sync-route-response-support] response support module missing token: ${token}`
    );
  }
  checks.push("response_support_owns_success_and_blocked_response_builders");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
