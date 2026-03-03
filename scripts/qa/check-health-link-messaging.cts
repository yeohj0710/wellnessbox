/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

const { buildFetchNotice, getFetchMessages } = require(path.join(
  ROOT,
  "app/(features)/health-link/fetchClientPolicy.ts"
)) as {
  buildFetchNotice: (
    payload: {
      cached?: boolean;
      forceRefreshGuarded?: boolean;
      partial?: boolean;
    },
    options: {
      cachedMessage: string;
      forceRefreshGuardedMessage: string;
      partialMessage: string;
      successMessage: string;
    }
  ) => string;
  getFetchMessages: (
    mode: "summary" | "detail",
    forceRefresh: boolean
  ) => {
    fallbackError: string;
    cachedMessage: string;
    forceRefreshGuardedMessage: string;
    partialMessage: string;
    successMessage: string;
  };
};

const { HEALTH_LINK_COPY } = require(path.join(
  ROOT,
  "app/(features)/health-link/copy.ts"
)) as {
  HEALTH_LINK_COPY: {
    hook: {
      initNoticeReused: string;
      initNoticeDbReused: string;
      initNoticeCreated: string;
      signNoticeReused: string;
      signNoticeCompleted: string;
      autoFetchAfterSignNotice: string;
      autoFetchOnEntryNotice: string;
    };
  };
};

function runPrimaryButtonLabelCases() {
  const viewModelSource = read("app/(features)/health-link/view-model.ts");
  assert.ok(
    viewModelSource.includes("if (flowKind === \"fetch\") return HEALTH_LINK_COPY.action.fetchNow;"),
    "fetch step button should use a single generalized label"
  );
  assert.ok(
    viewModelSource.includes("if (flowKind === \"sign\") return HEALTH_LINK_COPY.action.confirmAuth;"),
    "sign step button should use an explicit auth-complete label"
  );
  assert.ok(
    viewModelSource.includes("return HEALTH_LINK_COPY.action.next;"),
    "non-fetch step button should use a single generalized label"
  );
  console.log("[qa:health-link-messaging] PASS primary button labels");
}

function runInitSignNoticeCases() {
  assert.ok(HEALTH_LINK_COPY.hook.initNoticeCreated.includes("인증 요청"));
  assert.ok(HEALTH_LINK_COPY.hook.initNoticeReused.includes("인증 완료 확인"));
  assert.ok(HEALTH_LINK_COPY.hook.initNoticeDbReused.includes("저장된 정보"));
  assert.equal(
    HEALTH_LINK_COPY.hook.signNoticeCompleted,
    HEALTH_LINK_COPY.hook.signNoticeReused
  );
  assert.equal(
    HEALTH_LINK_COPY.hook.signNoticeCompleted,
    "인증 확인이 완료되었습니다."
  );
  assert.equal(
    HEALTH_LINK_COPY.hook.autoFetchAfterSignNotice,
    HEALTH_LINK_COPY.hook.autoFetchOnEntryNotice
  );
  console.log("[qa:health-link-messaging] PASS init/sign notice cases");
}

function runFetchMessageCases() {
  const summary = getFetchMessages("summary", false);
  const detailForced = getFetchMessages("detail", true);

  assert.equal(summary.cachedMessage, "저장된 정보를 반영했습니다.");
  assert.equal(summary.successMessage, "최신 정보를 불러왔습니다.");
  assert.equal(detailForced.successMessage, "최신 정보를 다시 불러왔습니다.");
  assert.ok(summary.fallbackError.includes("건강정보"));
  assert.ok(detailForced.fallbackError.includes("상세"));

  const options = {
    cachedMessage: "CACHED",
    forceRefreshGuardedMessage: "GUARDED",
    partialMessage: "PARTIAL",
    successMessage: "SUCCESS",
  };
  assert.equal(buildFetchNotice({ partial: true }, options), "PARTIAL");
  assert.equal(buildFetchNotice({ forceRefreshGuarded: true }, options), "GUARDED");
  assert.equal(buildFetchNotice({ cached: true }, options), "CACHED");
  assert.equal(buildFetchNotice({}, options), "SUCCESS");
  console.log("[qa:health-link-messaging] PASS fetch message cases");
}

function runStaticRegressionChecks() {
  const copySource = read("app/(features)/health-link/copy.ts");
  assert.ok(
    copySource.includes('next: "인증 시작"'),
    "health-link primary next action should use generalized wording"
  );
  assert.ok(
    copySource.includes('confirmAuth: "인증 완료 확인"'),
    "health-link sign action should use an explicit auth-complete wording"
  );
  assert.ok(
    copySource.includes('reload: "최신 정보 확인"'),
    "health-link reload action should use generalized wording"
  );
  assert.ok(
    copySource.includes('retryAuth: "인증 시작"'),
    "health-link retry action should use generalized wording"
  );
  assert.ok(
    copySource.includes('title: "인증 시작"'),
    "health-link reauth step should reuse unified auth-start wording"
  );
  assert.equal(
    copySource.includes("다시 진행"),
    false,
    "health-link copy should avoid ambiguous '다시 진행' wording"
  );
  assert.equal(
    copySource.includes("인증 다시하기"),
    false,
    "health-link copy should avoid split retry wording"
  );
  assert.equal(
    copySource.includes("재요청"),
    false,
    "health-link copy should avoid re-request wording"
  );
  assert.ok(
    copySource.includes("networkErrorFallback"),
    "health-link copy should include network error fallback message"
  );

  const requestSource = read("app/(features)/health-link/useNhisActionRequest.ts");
  assert.ok(
    requestSource.includes("controllersRef"),
    "action request hook should track in-flight controllers for navigation-abort handling"
  );
  assert.ok(
    requestSource.includes("window.navigator && window.navigator.onLine === false"),
    "action request hook should handle offline/network-disconnected cases"
  );
  assert.ok(
    requestSource.includes("error instanceof TypeError"),
    "action request hook should map network errors to user-friendly copy"
  );

  const helperSource = read("app/(features)/health-link/useNhisHealthLink.helpers.ts");
  assert.ok(
    helperSource.includes("resolveInitSuccessNotice"),
    "health-link init success notice helper should exist"
  );
  assert.ok(
    helperSource.includes("resolveSignSuccessNotice"),
    "health-link sign success notice helper should exist"
  );

  const policySource = read("app/(features)/health-link/fetchClientPolicy.ts");
  assert.ok(
    policySource.includes("저장된 정보를 반영했습니다."),
    "fetch policy should use generalized cached-success notice"
  );
  console.log("[qa:health-link-messaging] PASS static regression checks");
}

function run() {
  runPrimaryButtonLabelCases();
  runInitSignNoticeCases();
  runFetchMessageCases();
  runStaticRegressionChecks();
  console.log("[qa:health-link-messaging] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:health-link-messaging] FAIL", error);
  process.exit(1);
}
