/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const {
  __resetDbPoolShedStateForTest,
  isDbPoolShedActive,
  isPrismaPoolTimeoutError,
  runBestEffortDbWrite,
} = require(path.join(ROOT, "lib/server/db-resilience.ts")) as {
  __resetDbPoolShedStateForTest: () => void;
  isDbPoolShedActive: (nowMs?: number) => boolean;
  isPrismaPoolTimeoutError: (error: unknown) => boolean;
  runBestEffortDbWrite: (input: {
    label: string;
    task: () => Promise<unknown>;
    timeoutMs?: number;
    skipIfShed?: boolean;
    warnOnShed?: boolean;
  }) => Promise<{
    ok: boolean;
    skipped: boolean;
    reason: "ok" | "shed" | "timeout" | "error";
  }>;
};

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runPoolTimeoutSignatureCases() {
  assert.equal(
    isPrismaPoolTimeoutError(
      new Error(
        "Timed out fetching a new connection from the connection pool. (Current connection pool timeout: 10, connection limit: 7)"
      )
    ),
    true
  );
  assert.equal(
    isPrismaPoolTimeoutError(new Error("connection pool timeout reached")),
    true
  );
  assert.equal(
    isPrismaPoolTimeoutError(new Error("unique constraint failed")),
    false
  );
  console.log("[qa:b2b-sync-db-resilience] PASS pool-timeout signature");
}

async function runBestEffortWriteCases() {
  __resetDbPoolShedStateForTest();

  const success = await runBestEffortDbWrite({
    label: "qa-success",
    timeoutMs: 50,
    task: async () => "ok",
  });
  assert.equal(success.ok, true);
  assert.equal(success.reason, "ok");

  const timedOut = await runBestEffortDbWrite({
    label: "qa-timeout",
    timeoutMs: 10,
    task: () => new Promise(() => undefined),
  });
  assert.equal(timedOut.ok, false);
  assert.equal(timedOut.reason, "timeout");
  assert.equal(isDbPoolShedActive(), true);

  let invoked = false;
  const skipped = await runBestEffortDbWrite({
    label: "qa-shed",
    task: async () => {
      invoked = true;
    },
  });
  assert.equal(skipped.ok, false);
  assert.equal(skipped.reason, "shed");
  assert.equal(invoked, false);

  // Wait a short moment to ensure timer-based paths settle in CI.
  await delay(5);
  console.log("[qa:b2b-sync-db-resilience] PASS best-effort shed behavior");
}

function runStaticRegressionChecks() {
  const fetchAttemptSource = read("lib/server/hyphen/fetch-attempt.ts");
  assert.ok(
    fetchAttemptSource.includes("runBestEffortDbWrite"),
    "fetch-attempt should use best-effort DB writes"
  );
  assert.ok(
    fetchAttemptSource.includes("warnOnShed: false"),
    "operational attempt logging should suppress shed warning noise"
  );

  const employeeServiceSource = read("lib/b2b/employee-service.ts");
  const employeeServiceLogSource = read("lib/b2b/employee-service.logs.ts");
  assert.ok(
    employeeServiceLogSource.includes("runBestEffortDbWrite"),
    "employee-service log module should use best-effort DB writes"
  );
  assert.ok(
    employeeServiceSource.includes("HYPHEN_FETCH_TIMEOUT"),
    "employee sync should classify upstream timeout failures explicitly"
  );
  assert.ok(
    employeeServiceSource.includes("status: 504"),
    "employee sync timeout failures should map to HTTP 504"
  );

  const syncHandlerSource = read("lib/b2b/employee-sync-route-handler.ts");
  assert.ok(
    syncHandlerSource.includes("runWithHyphenInFlightDedup(\"b2b-employee-sync\""),
    "employee sync handler should dedupe in-flight duplicate requests"
  );
  assert.ok(
    syncHandlerSource.includes("generateAiEvaluation: input.payload.generateAiEvaluation === true"),
    "employee sync should not trigger AI evaluation unless explicitly requested"
  );

  const syncRouteSource = read("lib/b2b/employee-sync-route.ts");
  assert.ok(
    syncRouteSource.includes("buildDbPoolBusySyncResponse"),
    "employee sync route should map DB pool busy responses"
  );
  assert.ok(
    syncRouteSource.includes("nextAction: \"wait\""),
    "employee sync DB busy payload should guide wait action"
  );

  const dbErrorSource = read("lib/server/db-error.ts");
  assert.ok(
    dbErrorSource.includes("DB_POOL_TIMEOUT"),
    "db-error should classify DB pool timeout separately"
  );

  const clientUtilsSource = read("app/(features)/employee-report/_lib/client-utils.ts");
  const clientGuidanceSource = read(
    "app/(features)/employee-report/_lib/client-utils.guidance.ts"
  );
  assert.ok(
    clientUtilsSource.includes('export * from "./client-utils.guidance";'),
    "employee-report client-utils facade should re-export guidance helpers"
  );
  assert.ok(
    clientGuidanceSource.includes("DB_POOL_TIMEOUT"),
    "employee-report client guidance should handle DB pool timeout"
  );

  const hyphenRequestSource = read("lib/server/hyphen/client.request.ts");
  assert.ok(
    hyphenRequestSource.includes("resolveHyphenRequestDeadlineMs"),
    "hyphen requests should use per-request deadline guard"
  );
  assert.ok(
    hyphenRequestSource.includes("buildHyphenDeadlineError"),
    "hyphen request deadline should map to explicit timeout error"
  );

  const validationSource = read("lib/b2b/export/validation.ts");
  assert.ok(
    validationSource.includes("isReportExportEngineUnavailableReason"),
    "layout validation should classify export engine unavailable errors"
  );
  assert.ok(
    validationSource.includes("playwright runtime validation skipped"),
    "layout validation should log and skip when Playwright browser launch fails"
  );
  assert.ok(
    validationSource.includes("fallback: \"heuristic\""),
    "layout validation should fall back to heuristic runtime checks when Playwright is unavailable"
  );

  console.log("[qa:b2b-sync-db-resilience] PASS static regression checks");
}

async function run() {
  runPoolTimeoutSignatureCases();
  await runBestEffortWriteCases();
  runStaticRegressionChecks();
  console.log("[qa:b2b-sync-db-resilience] ALL PASS");
}

run().catch((error) => {
  console.error("[qa:b2b-sync-db-resilience] FAIL", error);
  process.exit(1);
});
