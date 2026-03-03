/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

const { isStaleSignErrorCode, resolveSignGuidance } = require(path.join(
  ROOT,
  "lib/server/hyphen/sign-guidance.ts"
)) as {
  isStaleSignErrorCode: (code: string | null | undefined) => boolean;
  resolveSignGuidance: (input: {
    code: string | null | undefined;
    message: string | null | undefined;
  }) =>
    | {
        nextAction: "init" | "sign";
        reason: string;
        status: number;
        error: string;
      }
    | null;
};

function runStaleCodeCases() {
  assert.equal(isStaleSignErrorCode("LOGIN-999"), true);
  assert.equal(isStaleSignErrorCode("C0012-001"), true);
  assert.equal(isStaleSignErrorCode("hyphen_timeout"), false);
  console.log("[qa:nhis-sign-guidance] PASS stale code cases");
}

function runGuidanceCases() {
  const staleGuidance = resolveSignGuidance({
    code: "LOGIN-999",
    message: "인증 세션이 만료되었습니다.",
  });
  assert.equal(staleGuidance?.nextAction, "init");
  assert.equal(staleGuidance?.reason, "nhis_auth_expired");
  console.log("[qa:nhis-sign-guidance] PASS stale guidance");

  const missingRequestGuidance = resolveSignGuidance({
    code: null,
    message: "요청 정보가 만료되었습니다.",
  });
  assert.equal(missingRequestGuidance?.nextAction, "init");
  assert.equal(missingRequestGuidance?.reason, "nhis_sign_init_required");
  console.log("[qa:nhis-sign-guidance] PASS init-required guidance");

  const timeoutCodeGuidance = resolveSignGuidance({
    code: "HYPHEN_TIMEOUT",
    message: "Hyphen API timed out after 25s",
  });
  assert.equal(timeoutCodeGuidance?.nextAction, "sign");
  assert.equal(timeoutCodeGuidance?.reason, "nhis_sign_pending");
  assert.ok(timeoutCodeGuidance?.error.includes("인증 완료 확인"));
  console.log("[qa:nhis-sign-guidance] PASS timeout-code guidance");

  const timeoutMessageGuidance = resolveSignGuidance({
    code: null,
    message: "응답이 지연되어 시간 초과가 발생했습니다.",
  });
  assert.equal(timeoutMessageGuidance?.nextAction, "sign");
  assert.equal(timeoutMessageGuidance?.reason, "nhis_sign_pending");
  console.log("[qa:nhis-sign-guidance] PASS timeout-message guidance");

  const pendingMessageGuidance = resolveSignGuidance({
    code: null,
    message: "카카오톡 인증 승인 대기 중입니다.",
  });
  assert.equal(pendingMessageGuidance?.nextAction, "sign");
  assert.equal(pendingMessageGuidance?.reason, "nhis_sign_pending");
  console.log("[qa:nhis-sign-guidance] PASS pending-message guidance");

  const unknownGuidance = resolveSignGuidance({
    code: null,
    message: "unexpected error",
  });
  assert.equal(unknownGuidance, null);
  console.log("[qa:nhis-sign-guidance] PASS unknown guidance");
}

function runStaticRegressionChecks() {
  const helperSource = read("lib/server/hyphen/sign-route-helpers.ts");
  assert.ok(
    helperSource.includes('from "@/lib/server/hyphen/sign-guidance"'),
    "sign-route-helpers should reuse shared sign guidance resolver"
  );

  const guidanceSource = read("lib/server/hyphen/sign-guidance.ts");
  assert.ok(
    guidanceSource.includes("HYPHEN_TIMEOUT"),
    "sign guidance should map timeout codes to sign-pending guidance"
  );
  assert.ok(
    guidanceSource.includes("인증 응답이 지연되고 있습니다."),
    "sign guidance should provide delayed-response UX copy"
  );
  console.log("[qa:nhis-sign-guidance] PASS static regression checks");
}

function run() {
  runStaleCodeCases();
  runGuidanceCases();
  runStaticRegressionChecks();
  console.log("[qa:nhis-sign-guidance] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:nhis-sign-guidance] FAIL", error);
  process.exit(1);
}
