/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relPath: string) {
  const absPath = path.join(ROOT, relPath);
  return fs.readFileSync(absPath, "utf8");
}

function assertIncludes(relPath: string, pattern: string, message: string) {
  const source = read(relPath);
  assert.ok(source.includes(pattern), `${relPath}: ${message}`);
}

function runAuthSyncCoreChecks() {
  const corePath = "lib/client/auth-sync.ts";
  assertIncludes(corePath, 'const AUTH_SYNC_EVENT_NAME = "wb:auth-sync"', "event name constant missing");
  assertIncludes(corePath, 'const AUTH_SYNC_STORAGE_KEY = "wb:auth-sync:v1"', "storage key constant missing");
  assertIncludes(corePath, "export function emitAuthSyncEvent", "emit helper missing");
  assertIncludes(corePath, "export function subscribeAuthSyncEvent", "subscribe helper missing");
  assertIncludes(corePath, '"user-session"', "user-session scope missing");
  assertIncludes(corePath, '"phone-link"', "phone-link scope missing");
  assertIncludes(corePath, '"b2b-employee-session"', "b2b scope missing");
  assertIncludes(corePath, '"nhis-link"', "nhis scope missing");
  console.log("[qa:auth-sync-contract] PASS core auth-sync utility");
}

function runEmitterChecks() {
  const checks: Array<{ file: string; pattern: string; label: string }> = [
    {
      file: "components/common/topBar.tsx",
      pattern: 'emitAuthSyncEvent({ scope: "user-session"',
      label: "top bar logout should emit user-session sync",
    },
    {
      file: "app/me/logoutButton.tsx",
      pattern: 'emitAuthSyncEvent({ scope: "user-session"',
      label: "my-page logout should emit user-session sync",
    },
    {
      file: "app/me/usePhoneLinkSectionState.ts",
      pattern: 'emitAuthSyncEvent({ scope: "phone-link"',
      label: "phone link success should emit phone-link sync",
    },
    {
      file: "app/me/useMeProfileMutations.ts",
      pattern: 'emitAuthSyncEvent({ scope: "phone-link"',
      label: "phone unlink success should emit phone-link sync",
    },
    {
      file: "components/order/hooks/usePhoneStatus.ts",
      pattern: 'emitAuthSyncEvent({ scope: "phone-link"',
      label: "order phone unlink should emit phone-link sync",
    },
    {
      file: "app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts",
      pattern: 'emitAuthSyncEvent({ scope: "phone-link"',
      label: "my-orders phone link state should emit phone-link sync",
    },
    {
      file: "app/survey/survey-page-client.tsx",
      pattern: 'scope: "b2b-employee-session"',
      label: "survey should emit b2b employee sync",
    },
    {
      file: "app/(features)/employee-report/EmployeeReportClient.tsx",
      pattern: 'emitAuthSyncEvent({ scope: "b2b-employee-session"',
      label: "employee-report should emit b2b employee sync",
    },
    {
      file: "app/(features)/employee-report/EmployeeReportClient.tsx",
      pattern: 'emitAuthSyncEvent({ scope: "nhis-link"',
      label: "employee-report should emit nhis sync",
    },
    {
      file: "app/(features)/health-link/useNhisHealthLink.ts",
      pattern: 'emitAuthSyncEvent({ scope: "nhis-link"',
      label: "health-link actions should emit nhis sync",
    },
  ];

  for (const check of checks) {
    assertIncludes(check.file, check.pattern, check.label);
    console.log(`[qa:auth-sync-contract] PASS emitter ${check.file}`);
  }
}

function runListenerChecks() {
  const checks: Array<{ file: string; pattern: string; label: string }> = [
    {
      file: "components/common/topBar.hooks.ts",
      pattern: "subscribeAuthSyncEvent",
      label: "top bar should subscribe auth sync",
    },
    {
      file: "components/order/cart.tsx",
      pattern: "subscribeAuthSyncEvent",
      label: "cart should subscribe auth sync",
    },
    {
      file: "components/order/hooks/usePhoneStatus.ts",
      pattern: 'scopes: ["user-session", "phone-link"]',
      label: "order phone hook should listen user-session/phone-link",
    },
    {
      file: "app/(orders)/my-orders/hooks/useLinkedPhoneStatus.ts",
      pattern: 'scopes: ["user-session", "phone-link"]',
      label: "my-orders phone hook should listen user-session/phone-link",
    },
    {
      file: "app/(features)/health-link/useNhisHealthLink.status.ts",
      pattern: 'scopes: ["user-session", "nhis-link"]',
      label: "health-link status should listen user-session/nhis-link",
    },
    {
      file: "app/(features)/employee-report/_lib/use-admin-login-status.ts",
      pattern: "subscribeAuthSyncEvent",
      label: "admin login status hook should listen auth sync",
    },
    {
      file: "app/column/_components/ColumnAdminWriteButton.tsx",
      pattern: "subscribeAuthSyncEvent",
      label: "column admin button should listen auth sync",
    },
    {
      file: "app/survey/survey-page-client.tsx",
      pattern: 'scopes: ["b2b-employee-session", "user-session"]',
      label: "survey should listen b2b-employee-session/user-session",
    },
    {
      file: "app/(features)/employee-report/EmployeeReportClient.tsx",
      pattern: 'scopes: ["user-session", "b2b-employee-session", "nhis-link"]',
      label: "employee-report should listen user-session/b2b/nhis",
    },
  ];

  for (const check of checks) {
    assertIncludes(check.file, check.pattern, check.label);
    console.log(`[qa:auth-sync-contract] PASS listener ${check.file}`);
  }
}

function runDocumentationChecks() {
  const docPath = "docs/maps/auth-sync-map.md";
  assertIncludes(docPath, "## 인증 축", "doc should explain auth domains");
  assertIncludes(docPath, "## 이벤트 계약", "doc should explain sync event contract");
  assertIncludes(docPath, "## 테스트 케이스", "doc should include test matrix");
  assertIncludes(docPath, "카카오 본인인증", "doc should describe external Kakao constraints");
  console.log("[qa:auth-sync-contract] PASS documentation checks");
}

function main() {
  runAuthSyncCoreChecks();
  runEmitterChecks();
  runListenerChecks();
  runDocumentationChecks();
  console.log("[qa:auth-sync-contract] PASS all checks");
}

main();
