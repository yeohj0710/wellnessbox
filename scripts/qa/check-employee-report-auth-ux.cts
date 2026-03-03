/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_UTILS_PATH = path.join(
  ROOT,
  "app/(features)/employee-report/_lib/client-utils.ts"
);

const {
  parseStoredIdentitySnapshot,
  resolveIdentityPrimaryActionLabel,
} = require(CLIENT_UTILS_PATH) as {
  parseStoredIdentitySnapshot: (
    raw: string | null | undefined,
    nowMs?: number
  ) => { source: string; identity: { name: string; birthDate: string; phone: string } | null; shouldClear: boolean };
  resolveIdentityPrimaryActionLabel: (input: {
    hasAuthAttempt: boolean;
    syncNextAction: "init" | "sign" | "retry" | null;
    storedIdentitySource: "none" | "v2" | "legacy" | "expired" | "invalid";
  }) => string;
};

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function runStoredIdentityCases() {
  const nowMs = Date.UTC(2026, 2, 3, 0, 0, 0);

  const freshV2Raw = JSON.stringify({
    schemaVersion: 2,
    savedAt: "2026-03-02T23:30:00.000Z",
    identity: {
      name: "홍길동",
      birthDate: "1990-01-01",
      phone: "010-1234-5678",
    },
  });
  const freshV2 = parseStoredIdentitySnapshot(freshV2Raw, nowMs);
  assert.equal(freshV2.source, "v2");
  assert.deepEqual(freshV2.identity, {
    name: "홍길동",
    birthDate: "19900101",
    phone: "01012345678",
  });
  assert.equal(freshV2.shouldClear, false);
  console.log("[qa:employee-report-auth-ux] PASS stored identity v2");

  const legacyRaw = JSON.stringify({
    savedAt: "2026-03-02T23:30:00.000Z",
    name: "김철수",
    birthDate: "19881212",
    phone: "01022223333",
  });
  const legacy = parseStoredIdentitySnapshot(legacyRaw, nowMs);
  assert.equal(legacy.source, "legacy");
  assert.deepEqual(legacy.identity, {
    name: "김철수",
    birthDate: "19881212",
    phone: "01022223333",
  });
  assert.equal(legacy.shouldClear, false);
  console.log("[qa:employee-report-auth-ux] PASS stored identity legacy");

  const legacyNestedRaw = JSON.stringify({
    savedAt: "2026-03-02T23:30:00.000Z",
    identity: {
      name: "이영희",
      birthDate: "1977-07-07",
      phone: "010-4444-5555",
    },
  });
  const legacyNested = parseStoredIdentitySnapshot(legacyNestedRaw, nowMs);
  assert.equal(legacyNested.source, "legacy");
  assert.deepEqual(legacyNested.identity, {
    name: "이영희",
    birthDate: "19770707",
    phone: "01044445555",
  });
  console.log("[qa:employee-report-auth-ux] PASS stored identity legacy nested");

  const expiredRaw = JSON.stringify({
    schemaVersion: 2,
    savedAt: "2020-01-01T00:00:00.000Z",
    identity: {
      name: "만료데이터",
      birthDate: "19990909",
      phone: "01099998888",
    },
  });
  const expired = parseStoredIdentitySnapshot(expiredRaw, nowMs);
  assert.equal(expired.source, "expired");
  assert.equal(expired.identity, null);
  assert.equal(expired.shouldClear, true);
  console.log("[qa:employee-report-auth-ux] PASS stored identity expired");

  const invalidRaw = "{this-is-not-json";
  const invalid = parseStoredIdentitySnapshot(invalidRaw, nowMs);
  assert.equal(invalid.source, "invalid");
  assert.equal(invalid.identity, null);
  assert.equal(invalid.shouldClear, true);
  console.log("[qa:employee-report-auth-ux] PASS stored identity invalid");

  const malformedValueRaw = JSON.stringify({
    schemaVersion: 2,
    savedAt: "2026-03-02T23:30:00.000Z",
    identity: {
      name: "형식오류",
      birthDate: "1999",
      phone: "010",
    },
  });
  const malformed = parseStoredIdentitySnapshot(malformedValueRaw, nowMs);
  assert.equal(malformed.source, "invalid");
  assert.equal(malformed.identity, null);
  assert.equal(malformed.shouldClear, true);
  console.log("[qa:employee-report-auth-ux] PASS stored identity malformed");
}

function runPrimaryActionLabelCases() {
  const firstTimeLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: false,
    syncNextAction: null,
    storedIdentitySource: "none",
  });
  assert.equal(firstTimeLabel, "인증 시작");
  console.log("[qa:employee-report-auth-ux] PASS first-time CTA");

  const cachedLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: false,
    syncNextAction: null,
    storedIdentitySource: "v2",
  });
  assert.equal(cachedLabel, "인증 시작");
  console.log("[qa:employee-report-auth-ux] PASS cached CTA");

  const legacyCachedLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: false,
    syncNextAction: null,
    storedIdentitySource: "legacy",
  });
  assert.equal(legacyCachedLabel, "인증 시작");
  console.log("[qa:employee-report-auth-ux] PASS legacy cached CTA");

  const retryLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: true,
    syncNextAction: null,
    storedIdentitySource: "none",
  });
  assert.equal(retryLabel, "인증 다시하기");
  console.log("[qa:employee-report-auth-ux] PASS retry CTA");

  const initGuidanceLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: false,
    syncNextAction: "init",
    storedIdentitySource: "none",
  });
  assert.equal(initGuidanceLabel, "인증 다시하기");
  console.log("[qa:employee-report-auth-ux] PASS init guidance CTA");

  const signGuidanceLabel = resolveIdentityPrimaryActionLabel({
    hasAuthAttempt: false,
    syncNextAction: "sign",
    storedIdentitySource: "none",
  });
  assert.equal(signGuidanceLabel, "인증 완료 확인");
  console.log("[qa:employee-report-auth-ux] PASS sign guidance CTA");
}

function runUiIntegrationChecks() {
  const clientSource = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  assert.ok(
    clientSource.includes("readStoredIdentityWithSource"),
    "EmployeeReportClient should read stored identity with source context."
  );
  assert.ok(
    clientSource.includes("primaryActionLabel={identityPrimaryActionLabel}"),
    "EmployeeReportClient should pass context-aware primaryActionLabel."
  );
  assert.ok(
    clientSource.includes("primarySyncActionLabel=\"최신 정보 확인\""),
    "EmployeeReportClient should set generalized summary CTA for existing DB report users."
  );

  const identitySectionSource = read(
    "app/(features)/employee-report/_components/EmployeeReportIdentitySection.tsx"
  );
  assert.ok(
    identitySectionSource.includes("primaryActionLabel"),
    "EmployeeReportIdentitySection should accept context-aware action label."
  );

  const summarySource = read(
    "app/(features)/employee-report/_components/EmployeeReportSummaryHeaderCard.tsx"
  );
  assert.ok(
    summarySource.includes("최신 정보 확인"),
    "EmployeeReportSummaryHeaderCard should default to '최신 정보 확인'."
  );
  assert.ok(
    summarySource.includes("인증 완료 확인"),
    "EmployeeReportSummaryHeaderCard should guide sign step with explicit completion wording."
  );
  assert.equal(
    summarySource.includes("진행 상태 확인"),
    false,
    "EmployeeReportSummaryHeaderCard should avoid ambiguous sign-step wording."
  );

  const guidanceSource = read(
    "app/(features)/employee-report/_components/EmployeeReportSyncGuidanceNotice.tsx"
  );
  assert.ok(
    guidanceSource.includes("인증 완료 확인"),
    "EmployeeReportSyncGuidanceNotice should use explicit sign-complete label."
  );
  assert.equal(
    guidanceSource.includes("진행 상태 확인"),
    false,
    "EmployeeReportSyncGuidanceNotice should avoid ambiguous status-check wording."
  );

  console.log("[qa:employee-report-auth-ux] PASS UI integration checks");
}

function run() {
  runStoredIdentityCases();
  runPrimaryActionLabelCases();
  runUiIntegrationChecks();
  console.log("[qa:employee-report-auth-ux] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:employee-report-auth-ux] FAIL", error);
  process.exit(1);
}
