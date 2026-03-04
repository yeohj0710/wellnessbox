/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

const {
  ApiRequestError,
  buildSyncGuidance,
  isPdfEngineUnavailableFailure,
  requestJson,
  resolveSyncCompletionNotice,
} = require(path.join(
  ROOT,
  "app/(features)/employee-report/_lib/client-utils.ts"
)) as {
  ApiRequestError: new (status: number, payload: any) => Error & {
    status: number;
    payload: { code?: string; reason?: string; nextAction?: string; error?: string };
  };
  buildSyncGuidance: (payload: any, status: number, fallbackMessage: string) => {
    code?: string;
    reason?: string;
    nextAction?: "init" | "sign" | "retry" | "wait";
    message: string;
    retryAfterSec?: number;
    availableAt?: string | null;
  };
  requestJson: <T>(
    url: string,
    init?: RequestInit,
    options?: {
      timeoutMs?: number;
      timeoutMessage?: string;
      networkErrorMessage?: string;
    }
  ) => Promise<T>;
  isPdfEngineUnavailableFailure: (input: {
    code?: string | null;
    reason?: string | null;
    error?: string | null;
  }) => boolean;
  resolveSyncCompletionNotice: (input: {
    sync?: {
      source?: "fresh" | "cache-valid" | "cache-history" | "snapshot-history";
      networkFetched?: boolean;
    };
    forceRefresh: boolean;
    authReused: boolean;
  }) => string;
};

function runSyncNoticeCases() {
  const expectedCompletionNotice =
    "건강정보 연동이 완료되었습니다. 이어서 설문을 진행해 주세요.";

  const fresh = resolveSyncCompletionNotice({
    sync: { source: "fresh", networkFetched: true },
    forceRefresh: false,
    authReused: false,
  });
  assert.equal(fresh, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS fresh notice");

  const forceFresh = resolveSyncCompletionNotice({
    sync: { source: "fresh", networkFetched: true },
    forceRefresh: true,
    authReused: false,
  });
  assert.equal(forceFresh, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS force fresh notice");

  const cacheValid = resolveSyncCompletionNotice({
    sync: { source: "cache-valid", networkFetched: false },
    forceRefresh: false,
    authReused: false,
  });
  assert.equal(cacheValid, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS cache-valid notice");

  const cacheHistory = resolveSyncCompletionNotice({
    sync: { source: "cache-history", networkFetched: false },
    forceRefresh: false,
    authReused: false,
  });
  assert.equal(cacheHistory, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS cache-history notice");

  const snapshotHistory = resolveSyncCompletionNotice({
    sync: { source: "snapshot-history", networkFetched: false },
    forceRefresh: false,
    authReused: false,
  });
  assert.equal(snapshotHistory, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS snapshot-history notice");

  const reusedAuth = resolveSyncCompletionNotice({
    sync: {},
    forceRefresh: false,
    authReused: true,
  });
  assert.equal(reusedAuth, expectedCompletionNotice);
  console.log("[qa:employee-report-sync-notice] PASS auth reused notice");
}

function runGuidanceCases() {
  const networkGuidance = buildSyncGuidance(
    {
      code: "NETWORK_ERROR",
      reason: "network_unreachable",
      error: "네트워크 연결이 불안정합니다.",
    },
    0,
    "fallback"
  );
  assert.equal(networkGuidance.nextAction, "retry");
  assert.ok(networkGuidance.message.includes("네트워크"));
  console.log("[qa:employee-report-sync-notice] PASS network guidance");

  const timeoutGuidance = buildSyncGuidance(
    {
      code: "CLIENT_TIMEOUT",
      reason: "client_timeout",
      error: "응답 시간이 길어 요청이 중단되었습니다.",
    },
    0,
    "fallback"
  );
  assert.equal(timeoutGuidance.nextAction, "retry");
  assert.ok(timeoutGuidance.message.includes("응답 시간"));
  console.log("[qa:employee-report-sync-notice] PASS timeout guidance");

  const upstreamTimeoutGuidance = buildSyncGuidance({}, 524, "fallback");
  assert.equal(upstreamTimeoutGuidance.nextAction, "retry");
  assert.ok(upstreamTimeoutGuidance.message.includes("시간 초과"));
  console.log("[qa:employee-report-sync-notice] PASS 524 guidance");

  const signTimeoutGuidance = buildSyncGuidance(
    {
      code: "HYPHEN_TIMEOUT",
      reason: "nhis_sign_pending",
      nextAction: "sign",
      error:
        "인증 응답이 지연되고 있습니다. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인'을 눌러 다시 확인해 주세요.",
    },
    504,
    "fallback"
  );
  assert.equal(signTimeoutGuidance.nextAction, "sign");
  assert.ok(signTimeoutGuidance.message.includes("카카오톡 인증 완료 후 확인"));
  assert.equal(signTimeoutGuidance.message.includes("시간 초과"), false);
  console.log("[qa:employee-report-sync-notice] PASS sign-timeout guidance");

  const waitGuidance = buildSyncGuidance(
    {
      code: "SYNC_COOLDOWN",
      reason: "force_refresh_cooldown",
      retryAfterSec: 18,
    },
    429,
    "fallback"
  );
  assert.equal(waitGuidance.nextAction, "wait");
  assert.equal(waitGuidance.retryAfterSec, 18);
  console.log("[qa:employee-report-sync-notice] PASS wait guidance");

  const signGuidance = buildSyncGuidance(
    {
      code: "NHIS_SIGN_REQUIRED",
      reason: "nhis_sign_required",
      nextAction: "sign",
    },
    409,
    "fallback"
  );
  assert.equal(signGuidance.nextAction, "sign");
  assert.ok(signGuidance.message.includes("카카오톡 인증 완료 후 확인"));
  console.log("[qa:employee-report-sync-notice] PASS sign guidance wording");

  const initGuidance = buildSyncGuidance(
    {
      code: "NHIS_INIT_REQUIRED",
      reason: "nhis_init_required",
      nextAction: "init",
    },
    409,
    "fallback"
  );
  assert.equal(initGuidance.nextAction, "init");
  assert.ok(initGuidance.message.includes("카카오톡으로 인증 보내기"));
  assert.equal(initGuidance.message.includes("다시하기"), false);
  console.log("[qa:employee-report-sync-notice] PASS init guidance wording");
}

async function runRequestJsonResilienceCases() {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    await assert.rejects(
      () =>
        requestJson("/api/test-network", undefined, {
          timeoutMs: 500,
        }),
      (error: unknown) =>
        error instanceof ApiRequestError &&
        error.status === 0 &&
        error.payload.code === "NETWORK_ERROR"
    );
    console.log("[qa:employee-report-sync-notice] PASS requestJson network error");

    globalThis.fetch = ((_: string, init?: RequestInit) =>
      new Promise((resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          reject({ name: "AbortError" });
          return;
        }
        signal.addEventListener(
          "abort",
          () => {
            reject({ name: "AbortError" });
          },
          { once: true }
        );
      })) as typeof fetch;

    await assert.rejects(
      () =>
        requestJson("/api/test-timeout", undefined, {
          timeoutMs: 20,
        }),
      (error: unknown) =>
        error instanceof ApiRequestError &&
        error.status === 0 &&
        error.payload.code === "CLIENT_TIMEOUT"
    );
    console.log("[qa:employee-report-sync-notice] PASS requestJson timeout error");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function runPdfEngineFallbackCases() {
  assert.equal(
    isPdfEngineUnavailableFailure({ code: "PDF_ENGINE_MISSING" }),
    true
  );
  assert.equal(
    isPdfEngineUnavailableFailure({
      reason: "browserType.launch: Executable doesn't exist",
    }),
    true
  );
  assert.equal(
    isPdfEngineUnavailableFailure({ reason: "unknown_pdf_error" }),
    false
  );
  console.log("[qa:employee-report-sync-notice] PASS pdf fallback detection");
}

function runStaticRegressionChecks() {
  const clientSource = read("app/(features)/employee-report/EmployeeReportClient.tsx");
  assert.ok(
    clientSource.includes("resolveSyncCompletionNotice"),
    "EmployeeReportClient should resolve sync notice via helper"
  );
  assert.ok(
    clientSource.includes("authReused: ready.reused"),
    "sync notice helper should receive auth reuse context"
  );
  assert.ok(
    clientSource.includes("primarySyncActionLabel=\"최신 정보 확인\""),
    "EmployeeReportClient should use generalized summary CTA text"
  );
  assert.ok(
    clientSource.includes("captureElementToPdf"),
    "EmployeeReportClient should include browser PDF capture fallback"
  );
  assert.ok(
    clientSource.includes("shouldPreferBrowserCapture"),
    "EmployeeReportClient should prefer browser PDF capture on narrow mobile viewports"
  );
  assert.ok(
    clientSource.includes("isPdfEngineUnavailableFailure"),
    "EmployeeReportClient should detect server PDF engine unavailability"
  );
  assert.ok(
    clientSource.includes("브라우저 화면 캡처로 PDF를 저장했습니다."),
    "EmployeeReportClient should show explicit browser PDF fallback notice"
  );

  const responseSource = read("lib/b2b/employee-sync-response.ts");
  assert.ok(
    responseSource.includes("networkFetched"),
    "sync response should expose networkFetched metadata"
  );

  const routeSource = read("lib/b2b/employee-sync-route.ts");
  assert.ok(
    routeSource.includes("networkFetched: false"),
    "snapshot-history sync responses should mark networkFetched false"
  );
  assert.ok(
    routeSource.includes("networkFetched: syncResult.source === \"fresh\""),
    "execute sync responses should derive networkFetched from source"
  );

  const stylesSource = read("components/b2b/B2bUx.module.css");
  assert.ok(
    stylesSource.includes("[data-report-pdf-parity=\"1\"] .reportSheet"),
    "mobile parity styles should target report sheet blocks"
  );
  assert.ok(
    stylesSource.includes("aspect-ratio: auto;"),
    "mobile parity styles should remove fixed page aspect ratio to avoid overflow clipping"
  );
  assert.ok(
    stylesSource.includes("[data-report-pdf-parity=\"1\"] .reportTopGrid"),
    "mobile parity styles should override report top grid layout"
  );
  console.log("[qa:employee-report-sync-notice] PASS static regression checks");
}

async function run() {
  runSyncNoticeCases();
  runGuidanceCases();
  await runRequestJsonResilienceCases();
  runPdfEngineFallbackCases();
  runStaticRegressionChecks();
  console.log("[qa:employee-report-sync-notice] ALL PASS");
}

run().catch((error) => {
  console.error("[qa:employee-report-sync-notice] FAIL", error);
  process.exit(1);
});
